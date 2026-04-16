/// <reference types="vitest/config" />
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), ...(process.env.ANALYZE ? [visualizer({ filename: 'dist/stats.html', open: true, gzipSize: true })] : [])],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
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
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'admin-motor/**', 'tlsrpt-motor/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', 'dist', 'src/test-setup.ts', '**/*.test.{ts,tsx}'],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 60 },
    },
  },
})
