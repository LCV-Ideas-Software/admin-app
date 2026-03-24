import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 800,
    modulePreload: {
      polyfill: false,
    },
  },
})
