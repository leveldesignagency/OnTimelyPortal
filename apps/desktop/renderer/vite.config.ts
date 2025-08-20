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
  
  return {
    base: isElectron ? './' : '/', // Relative for Electron, absolute for web
    plugins: [react()],
    server: {
      port: 3003,
      host: 'localhost'
    },
    define: {
      global: 'globalThis',
      // Fix Supabase browser compatibility
      'globalThis.Headers': 'undefined',
      'globalThis.Request': 'undefined',
      'globalThis.Response': 'undefined',
      'globalThis.fetch': 'fetch',
      // Expose env variables to the app
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_CLOUD_API_BASE_URL': JSON.stringify(env.VITE_CLOUD_API_BASE_URL),
      'import.meta.env.VITE_LOCAL_API_BASE_URL': JSON.stringify(env.VITE_LOCAL_API_BASE_URL),
      'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || 'Timely'),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV || mode),
      'import.meta.env.VITE_UPDATE_SERVER_URL': JSON.stringify(env.VITE_UPDATE_SERVER_URL)
    },
    optimizeDeps: {
      exclude: ['electron'],
      include: ['@supabase/supabase-js']
    },
    build: {
      outDir: isElectron ? '../dist' : 'dist', // Parent dir for Electron, local for web
      emptyOutDir: true,
      rollupOptions: {
        external: isElectron ? ['electron', 'path', 'fs', 'os'] : [],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js']
          },
          globals: {
            '@supabase/supabase-js': 'supabase'
          }
        },
        onwarn(warning, warn) {
          // Ignore certain warnings that are not critical
          if (warning.code === 'UNRESOLVED_IMPORT' && 
              (warning.message.includes('define-globalThis-property') ||
               warning.message.includes('internals/define-globalThis-property') ||
               warning.message.includes('globalThis-this') ||
               warning.message.includes('internals/globalThis-this'))) {
            return;
          }
          warn(warning);
        }
      },
      // Ensure environment variables are available at build time
      envPrefix: 'VITE_',
      target: 'es2020',
      commonjsOptions: {
        ignore: ['define-globalThis-property', 'globalThis-this']
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        // Add aliases to handle problematic imports
        '../internals/define-globalThis-property': resolve(__dirname, 'src/utils/empty-module.js'),
        '../internals/globalThis-this': resolve(__dirname, 'src/utils/empty-module.js'),
        'define-globalThis-property': resolve(__dirname, 'src/utils/empty-module.js'),
        'globalThis-this': resolve(__dirname, 'src/utils/empty-module.js')
      }
    }
  }
})
