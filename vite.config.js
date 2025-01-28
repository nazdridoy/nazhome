import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  root: './src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: false,
        inlineDynamicImports: true
      }
    }
  },
  plugins: [
    createHtmlPlugin({
      minify: true
    })
  ],
  css: {
    postcss: {
      plugins: [
      ]
    }
  }
}) 