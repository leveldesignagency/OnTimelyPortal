import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Determine build target
  const target = process.env.VITE_TARGET || 'web';
  const isElectron = target === 'electron';
  
  console.log(`🔧 Building for target: ${target} (isElectron: ${isElectron})`);
  
  return {
    base: isElectron ? './' : '/', // Relative for Electron, absolute for web
    plugins: [react()],
    server: {
      port: 3003,
      host: 'localhost'
    },
    define: {
      // Only add process.env polyfills that are actually needed
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_TARGET': JSON.stringify(target),
      // Expose env variables to the app
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_CLOUD_API_BASE_URL': JSON.stringify(env.VITE_CLOUD_API_BASE_URL),
      'import.meta.env.VITE_LOCAL_API_BASE_URL': JSON.stringify(env.VITE_LOCAL_API_BASE_URL),
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || 'Timely'),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode),
      'import.meta.env.VITE_UPDATE_SERVER_URL': JSON.stringify(env.VITE_UPDATE_SERVER_URL),
      // Add calendar service environment variables
      'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
      'process.env.VITE_OUTLOOK_CLIENT_ID': JSON.stringify(env.VITE_OUTLOOK_CLIENT_ID),
      'process.env.VITE_GOOGLE_CLIENT_SECRET': JSON.stringify(env.VITE_GOOGLE_CLIENT_SECRET),
      'process.env.VITE_OUTLOOK_CLIENT_SECRET': JSON.stringify(env.VITE_OUTLOOK_CLIENT_SECRET)
    },
    optimizeDeps: {
      exclude: ['electron'],
      include: isElectron ? ['@supabase/supabase-js'] : []
    },
    build: {
      outDir: isElectron ? '../dist' : 'dist', // Parent dir for Electron, local for web
      emptyOutDir: true,
      rollupOptions: {
        external: isElectron ? ['electron', 'path', 'fs', 'os'] : [],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom']
          }
        }
      },
      // Ensure environment variables are available at build time
      envPrefix: 'VITE_',
      target: 'es2020'
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})
