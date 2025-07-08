import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    host: 'localhost'
  },
  define: {
    global: 'globalThis',
    'process.env': JSON.stringify(process.env)
  },
  optimizeDeps: {
    exclude: ['electron']
  },
  build: {
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'os']
    }
  }
})
