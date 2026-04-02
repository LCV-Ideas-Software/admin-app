import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'vendor-tiptap'
          }

          if (id.includes('lowlight') || id.includes('highlight.js')) {
            return 'vendor-editor-highlight'
          }

          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react'
          }
        },
      },
    },
    modulePreload: {
      polyfill: false,
    },
  },
  // Desabilita lightningcss para resolver problema em Windows
  optimizeDeps: {
    exclude: ['lightningcss']
  }
})
