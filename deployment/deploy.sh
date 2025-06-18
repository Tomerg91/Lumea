#!/bin/bash

# SatyaCoaching Platform Deployment Script
# Usage: ./deploy.sh [staging|production] [options]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-staging}
FORCE_DEPLOY=${2:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
validate_environment() {
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
        exit 1
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required commands exist
    local commands=("node" "npm" "git" "docker" "docker-compose")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    if ! node -e "process.exit(require('semver').gte('$node_version', '$required_version'))" 2>/dev/null; then
        log_error "Node.js version $node_version is not supported. Minimum required: $required_version"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

check_environment_file() {
    local env_file="$PROJECT_ROOT/server/.env.$ENVIRONMENT"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        log_info "Create the environment file based on server-env.example"
        exit 1
    fi
    
    # Check for required environment variables
    local required_vars=("DATABASE_URL" "JWT_SECRET" "SESSION_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$env_file"; then
            log_error "Required environment variable $var not found in $env_file"
            exit 1
        fi
    done
    
    log_success "Environment file validation passed"
}

run_tests() {
    if [[ "$ENVIRONMENT" == "production" && "$FORCE_DEPLOY" != "true" ]]; then
        log_info "Running tests before production deployment..."
        
        cd "$PROJECT_ROOT/client"
        npm test -- --run --reporter=verbose
        
        cd "$PROJECT_ROOT/server"
        npm test
        
        log_success "Tests passed"
    else
        log_warning "Skipping tests for $ENVIRONMENT deployment"
    fi
}

build_client() {
    log_info "Building client application..."
    
    cd "$PROJECT_ROOT/client"
    
    # Install dependencies
    npm ci --only=production
    
    # Set environment variables for build
    export VITE_API_URL=$(grep VITE_API_URL "../server/.env.$ENVIRONMENT" | cut -d'=' -f2)
    export VITE_SUPABASE_URL=$(grep VITE_SUPABASE_URL "../server/.env.$ENVIRONMENT" | cut -d'=' -f2)
    export VITE_SUPABASE_ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY "../server/.env.$ENVIRONMENT" | cut -d'=' -f2)
    
    # Build the application
    npm run build
    
    # Verify build output
    if [[ ! -d "dist" ]]; then
        log_error "Client build failed - dist directory not found"
        exit 1
    fi
    
    log_success "Client build completed"
}

build_server() {
    log_info "Building server application..."
    
    cd "$PROJECT_ROOT/server"
    
    # Install dependencies
    npm ci --only=production
    
    # Build TypeScript
    npm run build
    
    # Verify build output
    if [[ ! -d "dist" ]]; then
        log_error "Server build failed - dist directory not found"
        exit 1
    fi
    
    log_success "Server build completed"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT/server"
    
    # Set environment
    export NODE_ENV="$ENVIRONMENT"
    
    # Run Prisma migrations
    npx prisma migrate deploy
    
    # Generate Prisma client
    npx prisma generate
    
    log_success "Database migrations completed"
}

deploy_to_docker() {
    log_info "Deploying with Docker Compose..."
    
    cd "$SCRIPT_DIR"
    
    # Copy environment file
    cp "$PROJECT_ROOT/server/.env.$ENVIRONMENT" "$PROJECT_ROOT/server/.env.production"
    
    # Pull latest images
    docker-compose -f "docker-compose.$ENVIRONMENT.yml" pull
    
    # Build and start services
    docker-compose -f "docker-compose.$ENVIRONMENT.yml" up -d --build
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check health
    local health_url="http://localhost:3001/health"
    if curl -f "$health_url" > /dev/null 2>&1; then
        log_success "Application is healthy and running"
    else
        log_error "Application health check failed"
        docker-compose -f "docker-compose.$ENVIRONMENT.yml" logs
        exit 1
    fi
}

deploy_to_vercel() {
    log_info "Deploying to Vercel..."
    
    # Install Vercel CLI if not present
    if ! command -v vercel &> /dev/null; then
        npm install -g vercel
    fi
    
    cd "$PROJECT_ROOT"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel --prod
    else
        vercel
    fi
    
    log_success "Vercel deployment completed"
}

create_backup() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Creating pre-deployment backup..."
        
        # Create backup timestamp
        local backup_timestamp=$(date +%Y%m%d_%H%M%S)
        
        # Database backup (if using PostgreSQL)
        if grep -q "postgresql://" "$PROJECT_ROOT/server/.env.$ENVIRONMENT"; then
            local db_url=$(grep DATABASE_URL "$PROJECT_ROOT/server/.env.$ENVIRONMENT" | cut -d'=' -f2)
            pg_dump "$db_url" > "$SCRIPT_DIR/backups/db_backup_$backup_timestamp.sql"
        fi
        
        log_success "Backup created: $backup_timestamp"
    fi
}

post_deployment_checks() {
    log_info "Running post-deployment checks..."
    
    local base_url
    if [[ "$ENVIRONMENT" == "production" ]]; then
        base_url="https://api.satyacoaching.com"
    else
        base_url="https://staging-api.satyacoaching.com"
    fi
    
    # Check health endpoint
    if curl -f "$base_url/health" > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
    
    # Check ready endpoint
    if curl -f "$base_url/ready" > /dev/null 2>&1; then
        log_success "Readiness check passed"
    else
        log_warning "Readiness check failed - application may still be starting"
    fi
    
    log_success "Post-deployment checks completed"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    # Remove temporary files
    rm -f "$PROJECT_ROOT/server/.env.production"
    
    # Prune unused Docker images (if using Docker)
    if command -v docker &> /dev/null; then
        docker system prune -f
    fi
    
    log_success "Cleanup completed"
}

main() {
    echo "=========================================="
    echo "SatyaCoaching Platform Deployment"
    echo "Environment: $ENVIRONMENT"
    echo "=========================================="
    
    # Create backup directory if it doesn't exist
    mkdir -p "$SCRIPT_DIR/backups"
    
    # Run deployment steps
    validate_environment
    check_prerequisites
    check_environment_file
    create_backup
    run_tests
    build_client
    build_server
    run_database_migrations
    
    # Choose deployment method based on configuration
    if [[ -f "$SCRIPT_DIR/docker-compose.$ENVIRONMENT.yml" ]]; then
        deploy_to_docker
    else
        deploy_to_vercel
    fi
    
    post_deployment_checks
    cleanup
    
    log_success "🚀 Deployment to $ENVIRONMENT completed successfully!"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "🎉 SatyaCoaching Platform is now live!"
        log_info "Monitor the application at: https://app.satyacoaching.com"
    else
        log_info "🧪 Staging environment is ready for testing"
        log_info "Access at: https://staging.satyacoaching.com"
    fi
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@" 