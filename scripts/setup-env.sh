#!/bin/bash

# Environment Setup Script for SatyaCoaching
# This script helps set up development environment files

set -e

echo "🚀 Setting up SatyaCoaching development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Setting up environment files...${NC}"

# Create client .env from example
if [ ! -f "client/.env" ]; then
    if [ -f "client-env.example" ]; then
        cp client-env.example client/.env
        echo -e "${GREEN}✅ Created client/.env from example${NC}"
        echo -e "${YELLOW}⚠️  Please update client/.env with your actual values${NC}"
    else
        echo -e "${RED}❌ client-env.example not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  client/.env already exists, skipping...${NC}"
fi

# Create server .env from example
if [ ! -f "server/.env" ]; then
    if [ -f "server-env.example" ]; then
        cp server-env.example server/.env
        echo -e "${GREEN}✅ Created server/.env from example${NC}"
        echo -e "${YELLOW}⚠️  Please update server/.env with your actual values${NC}"
    else
        echo -e "${RED}❌ server-env.example not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  server/.env already exists, skipping...${NC}"
fi

# Generate secure secrets
echo -e "${BLUE}🔐 Generating secure secrets...${NC}"
node scripts/generate-secrets.js

echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Update client/.env with your Supabase and API URLs"
echo "2. Update server/.env with generated secrets and database credentials"
echo "3. Set up your Supabase project and get the credentials"
echo "4. Configure your email service (SendGrid or SMTP)"
echo "5. Run 'npm run dev' to start development servers"

echo -e "${GREEN}✅ Environment setup complete!${NC}"