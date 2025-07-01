#!/bin/bash

# Deployment script for SatyaCoaching to Vercel
# This script handles the deployment process

echo "🚀 Starting deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Build the project
echo "📦 Building the project..."
cd client && npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
cd .. && vercel --prod

echo "🎉 Deployment complete!"
echo "📝 Remember to set up your environment variables in the Vercel dashboard:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "   - VITE_RAILWAY_API_URL (optional)"
echo "   - VITE_STRIPE_PUBLISHABLE_KEY (optional)"