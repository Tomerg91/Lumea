#!/bin/bash

# SatyaCoaching Development Startup Script
# This script handles Supabase setup and starts the development environment

echo "🚀 Starting SatyaCoaching Development Environment"
echo "================================================="

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Please install Docker Desktop and restart it."
    echo "   You can download it from: https://www.docker.com/products/docker-desktop"
    echo ""
    echo "🔧 Alternative: Using mock authentication for development"
    echo "   The app will work with limited functionality until Supabase is set up."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo "⚠️  Docker daemon is not running. Please start Docker Desktop."
    echo ""
    echo "🔧 Alternative: Using mock authentication for development"
    echo "   The app will work with limited functionality until Docker is running."
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Installing via Homebrew..."
    brew install supabase/tap/supabase
fi

# Start Supabase local development
echo "🔌 Starting Supabase local development..."
cd "$(dirname "$0")/.."

# Check if Supabase is already running
if ! supabase status &> /dev/null; then
    echo "   Initializing Supabase..."
    supabase start
else
    echo "   ✅ Supabase is already running"
    supabase status
fi

# Get the local Supabase configuration
SUPABASE_URL=$(supabase status --output env | grep SUPABASE_URL | cut -d'=' -f2)
SUPABASE_ANON_KEY=$(supabase status --output env | grep SUPABASE_ANON_KEY | cut -d'=' -f2)

# Update client environment
echo "🔧 Updating client environment configuration..."
cat > client/.env.local << EOF
# Local Supabase Development Configuration (Auto-generated)
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_DEFAULT_LANGUAGE=he
VITE_DEV_MODE=true
VITE_API_URL=http://localhost:3000
EOF

echo "✅ Environment configured for local development"
echo ""
echo "🌐 Development URLs:"
echo "   Client App:     http://localhost:8080"
echo "   Supabase Studio: http://localhost:54323"
echo "   API:            http://localhost:54321"
echo ""
echo "📚 To start the client:"
echo "   cd client && npm run dev"
echo ""
echo "🔐 Default credentials for testing:"
echo "   Email: admin@satyacoaching.com"
echo "   Password: password123"
echo ""
echo "💡 Access Supabase Studio at http://localhost:54323 to manage data" 