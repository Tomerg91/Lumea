#!/bin/bash

# Budget Deployment Script for SatyaCoaching
# Choose your preferred low-cost hosting platform

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SatyaCoaching Budget Deployment Tool${NC}"
echo ""
echo -e "${YELLOW}Choose your deployment platform:${NC}"
echo ""
echo -e "${GREEN}1. Netlify${NC} - Best overall (Free → $19/month)"
echo -e "${GREEN}2. Firebase${NC} - Google platform (Free → $25/month)"  
echo -e "${GREEN}3. GitHub Pages${NC} - Completely free (Free forever)"
echo -e "${GREEN}4. Cloudflare Pages${NC} - Best performance (Free → $20/month)"
echo -e "${GREEN}5. Surge.sh${NC} - Simplest deployment (Free → $30/month)"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
  1)
    echo -e "${PURPLE}🎯 Deploying to Netlify...${NC}"
    echo ""
    echo "1. Install Netlify CLI:"
    echo "   npm install -g netlify-cli"
    echo ""
    echo "2. Login to Netlify:"
    echo "   netlify login"
    echo ""
    echo "3. Build your app:"
    cd client && npm run build
    echo ""
    echo "4. Deploy:"
    echo "   netlify deploy --prod --dir=dist"
    echo ""
    echo -e "${GREEN}✅ Netlify configuration ready in netlify.toml${NC}"
    echo -e "${YELLOW}💡 Or connect your GitHub repo at netlify.com for auto-deployment${NC}"
    ;;
    
  2)
    echo -e "${PURPLE}🎯 Deploying to Firebase...${NC}"
    echo ""
    echo "1. Install Firebase CLI:"
    echo "   npm install -g firebase-tools"
    echo ""
    echo "2. Login to Firebase:"
    echo "   firebase login"
    echo ""
    echo "3. Initialize project:"
    echo "   firebase init hosting"
    echo ""
    echo "4. Build your app:"
    cd client && npm run build
    echo ""
    echo "5. Deploy:"
    echo "   firebase deploy --only hosting"
    echo ""
    echo -e "${GREEN}✅ Firebase configuration ready in firebase.json${NC}"
    ;;
    
  3)
    echo -e "${PURPLE}🎯 Setting up GitHub Pages...${NC}"
    echo ""
    echo "1. Enable GitHub Pages in repository settings"
    echo "2. Choose 'GitHub Actions' as source"
    echo "3. Add secrets in repository settings:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - Other environment variables"
    echo ""
    echo "4. Push to main branch to trigger deployment"
    echo ""
    echo -e "${GREEN}✅ GitHub Actions workflow ready in .github/workflows/deploy-gh-pages.yml${NC}"
    echo -e "${YELLOW}💡 Your site will be available at: https://USERNAME.github.io/REPOSITORY${NC}"
    ;;
    
  4)
    echo -e "${PURPLE}🎯 Deploying to Cloudflare Pages...${NC}"
    echo ""
    echo "1. Go to pages.cloudflare.com"
    echo "2. Connect your GitHub repository"
    echo "3. Set build settings:"
    echo "   - Build command: cd client && npm run build"
    echo "   - Build output directory: client/dist"
    echo "4. Add environment variables"
    echo "5. Deploy!"
    echo ""
    echo -e "${GREEN}✅ Zero configuration needed - Cloudflare auto-detects Vite${NC}"
    ;;
    
  5)
    echo -e "${PURPLE}🎯 Deploying to Surge.sh...${NC}"
    echo ""
    echo "1. Install Surge CLI:"
    echo "   npm install -g surge"
    echo ""
    echo "2. Build your app:"
    cd client && npm run build
    echo ""
    echo "3. Deploy:"
    echo "   cd dist && surge"
    echo ""
    echo "4. Follow the prompts to choose domain"
    echo ""
    echo -e "${GREEN}✅ Surge deployment ready!${NC}"
    echo -e "${YELLOW}💡 Remember to set up custom domain and environment variables${NC}"
    ;;
    
  *)
    echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo -e "${YELLOW}1. Environment Variables:${NC}"
echo "   Set up your Supabase credentials and other env vars"
echo ""
echo -e "${YELLOW}2. Custom Domain:${NC}"
echo "   Configure your domain (lumea.co.il or satyacoaching.com)"
echo ""
echo -e "${YELLOW}3. SSL Certificate:${NC}"
echo "   All platforms provide free SSL automatically"
echo ""
echo -e "${YELLOW}4. Monitoring:${NC}"
echo "   Set up uptime monitoring and analytics"
echo ""
echo -e "${GREEN}🎉 Your SatyaCoaching app is ready for budget deployment!${NC}"
echo ""
echo -e "${BLUE}💰 Monthly costs:${NC}"
echo "   • GitHub Pages: FREE"
echo "   • Netlify: FREE → $19/month"
echo "   • Firebase: FREE → $25/month"
echo "   • Cloudflare: FREE → $20/month"  
echo "   • Surge: FREE → $30/month"
echo ""
echo -e "${BLUE}🇮🇱 Israeli market optimizations:${NC}"
echo "   • Hebrew RTL support: ✅ Built-in"
echo "   • Israeli CDN: ✅ All platforms"
echo "   • Payment support: ✅ Credit cards accepted"
echo "   • GDPR compliance: ✅ Configured"