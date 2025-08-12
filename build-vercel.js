#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting custom Vercel build...');

try {
  // Change to the renderer directory where the actual desktop app lives
  const rendererPath = path.join(__dirname, 'desktop', 'renderer');
  console.log(`📁 Changing to directory: ${rendererPath}`);
  process.chdir(rendererPath);
  
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Build the desktop app
  console.log('🔨 Building desktop app...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 