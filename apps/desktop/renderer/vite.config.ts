import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 3003,
      host: 'localhost'
    },
    define: {
      global: 'globalThis',
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
      exclude: ['electron']
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        external: ['electron', 'path', 'fs', 'os'],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js']
          }
        }
      },
      // Ensure environment variables are available at build time
      envPrefix: 'VITE_'
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})
