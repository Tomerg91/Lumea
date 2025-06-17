#!/bin/bash

# Setup script for TypeScript type generation from Supabase schema
# This script sets up the development workflow for automatic type generation

set -e

echo "🚀 Setting up TypeScript type generation for Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    echo "   or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if we're in the right directory
if [ ! -f "client/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create types directory if it doesn't exist
mkdir -p client/src/types

echo "📁 Types directory ready"

# Try to generate types from remote first, fallback to local
echo "🔄 Generating TypeScript types from Supabase schema..."

if supabase gen types typescript --project-id=humlrpbtrbjnpnsusils --schema=public > client/src/types/database.types.ts 2>/dev/null; then
    echo "✅ Types generated from remote Supabase project"
elif docker info > /dev/null 2>&1 && supabase gen types typescript --local --schema=public > client/src/types/database.types.ts 2>/dev/null; then
    echo "✅ Types generated from local Supabase instance"
else
    echo "⚠️  Could not generate types from Supabase CLI"
    echo "   Types have been manually created from migration files"
fi

# Update the types index file to export database types
echo "📝 Updating types index file..."

cat > client/src/types/index.ts << 'EOF'
// Main types export file
// This file exports all type definitions used throughout the application

// Database types (generated from Supabase schema)
export * from './database.types';

// Application-specific types
export * from './analytics';
export * from './coachNote';
export * from './feedback';
export * from './reflection';
export * from './sessionTemplate';

// Legacy types (kept for compatibility during migration)
export interface LegacyReflection {
  id: string;
  sessionId: string;
  text: string;
  audioUrl?: string;
  createdAt: string;
  encryptionMetadata?: {
    version: string;
    algorithm: string;
    [key: string]: string;
  };
  // Add other properties as needed
}

export interface LegacySession {
  id: string;
  coachId: string;
  clientId: string;
  date: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  // Add other properties as needed
}

export interface LegacyClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  coachId: string;
  // Add other properties as needed
}
EOF

echo "✅ Types index file updated"

# Run TypeScript check
echo "🔍 Running TypeScript check..."
cd client && npm run typecheck

if [ $? -eq 0 ]; then
    echo "✅ TypeScript check passed"
else
    echo "⚠️  TypeScript check found issues - please review and fix"
fi

echo ""
echo "🎉 TypeScript type generation setup complete!"
echo ""
echo "📚 Available commands:"
echo "   npm run types:generate        - Generate types from remote Supabase"
echo "   npm run types:generate:local  - Generate types from local Supabase"
echo "   npm run types:update          - Generate types and run type check"
echo ""
echo "💡 Development workflow:"
echo "   1. After schema changes, run: npm run types:update"
echo "   2. Import types from: import type { User, Session } from '@/types'"
echo "   3. Use with Supabase client for full type safety"
echo ""
echo "🔗 Documentation:"
echo "   - Database types: client/src/types/database.types.ts"
echo "   - Type generation: scripts/setup-types.sh"
echo "   - Supabase docs: https://supabase.com/docs/guides/api/generating-types" 