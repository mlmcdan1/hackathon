import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { keystaticDevMiddleware } from './scripts/keystaticDevMiddleware'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), keystaticDevMiddleware()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('node_modules/three/')) {
            return 'three-vendor'
          }

          if (id.includes('react-dom') || id.includes('/react/')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
