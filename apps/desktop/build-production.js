import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting production build for Timely Desktop App...');

try {
  // 1. Install main dependencies
  console.log('📦 Installing main dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
  
  // 2. Install backend server dependencies
  console.log('📦 Installing backend server dependencies...');
  const backendPath = path.join(__dirname, 'dist-electron');
  if (fs.existsSync(path.join(backendPath, 'package.json'))) {
    execSync('npm install', { stdio: 'inherit', cwd: backendPath });
  }
  
  // 3. Build the renderer
  console.log('🔨 Building renderer...');
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  
  // 4. Build Electron app
  console.log('⚡ Building Electron app...');
  execSync('npm run electron:build', { stdio: 'inherit', cwd: __dirname });
  
  console.log('✅ Production build complete!');
  console.log('📁 Check the dist-electron directory for your .dmg file');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 