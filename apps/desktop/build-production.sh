#!/bin/bash

# Timely Desktop App Production Build Script
# This script builds a production-ready DMG with proper environment variables

set -e  # Exit on any error

echo "🚀 Starting Timely Desktop Production Build..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run this script from the apps/desktop directory${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f "renderer/.env.production" ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo "Please create renderer/.env.production with your Supabase credentials"
    echo "Copy from env.production template and fill in your values"
    exit 1
fi

# Check if required environment variables are set
source renderer/.env.production

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Error: Missing required environment variables!${NC}"
    echo "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.production"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build production version
echo "🔨 Building production version..."
npm run build:prod

# Build Electron app
echo "⚡ Building Electron app..."
npm run dmg

echo -e "${GREEN}🎉 Production build complete!${NC}"
echo "📁 DMG file should be in dist-electron/ directory"
echo "🚀 Ready for distribution!"
