# 🚀 Timely Desktop Production Build Guide

This guide will help you build a production-ready DMG file for distribution.

## 🎯 What We Fixed

- ✅ **Supabase Client**: No more hardcoded credentials or local storage usage
- ✅ **Environment Variables**: Proper production configuration
- ✅ **Build Process**: Clean Vite + Electron build pipeline
- ✅ **DMG Creation**: Automated DMG generation
- ✅ **Auto-Updates**: Framework for future update system

## 📋 Prerequisites

1. **Node.js 18+** installed
2. **macOS** (for DMG creation)
3. **Your Supabase credentials**

## 🔧 Setup Steps

### 1. Create Production Environment File

Copy the template and fill in your values:

```bash
cd apps/desktop
cp renderer/env.production renderer/.env.production
```

Edit `renderer/.env.production` with your actual values:

```env
# REQUIRED: Your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here

# Optional: Your Vercel API domain
VITE_CLOUD_API_BASE_URL=https://your-vercel-domain.com
VITE_LOCAL_API_BASE_URL=http://localhost:3001

# App info
VITE_APP_NAME=Timely
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

### 2. Build the DMG

#### Option A: Automated Script (Recommended)
```bash
cd apps/desktop
./build-production.sh
```

#### Option B: Manual Steps
```bash
cd apps/desktop

# Clean previous builds
npm run clean

# Install dependencies
npm install

# Build production version
npm run build:prod

# Create DMG
npm run dmg
```

## 📁 Output

The DMG file will be created in:
```
apps/desktop/dist-electron/Timely-1.0.0.dmg
```

## 🔍 Troubleshooting

### White Screen Issues
- ✅ **Fixed**: Supabase client now properly configured for Electron
- ✅ **Fixed**: No more local storage conflicts
- ✅ **Fixed**: Proper environment variable injection

### Build Errors
- Make sure `.env.production` exists and has valid Supabase credentials
- Run `npm run clean` before building
- Check Node.js version (18+ required)

### Supabase Connection Issues
- Verify your Supabase URL and anon key
- Check if your Supabase project allows connections from your IP
- Ensure RLS policies are configured correctly

## 🚀 Distribution

### For Users
1. Download the DMG file
2. Double-click to mount
3. Drag Timely to Applications folder
4. Launch from Applications

### For Updates (Future)
The app is configured for auto-updates. Users won't need to download new DMGs for minor updates.

## 🔐 Security Notes

- ✅ **No hardcoded credentials** in the built app
- ✅ **Environment variables** are embedded at build time
- ✅ **Supabase client** properly configured for production
- ✅ **Local storage disabled** to prevent conflicts

## 📞 Support

If you encounter issues:
1. Check the console logs in the built app
2. Verify your `.env.production` file
3. Ensure Supabase project is accessible
4. Check network connectivity

---

**Next Steps**: Once this builds successfully, we can set up the auto-update system so users get updates without new DMG downloads. 