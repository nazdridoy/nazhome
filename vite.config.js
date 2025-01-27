import { defineConfig } from 'vite'
import html from 'vite-plugin-html'

export default defineConfig({
  publicDir: 'public',
  build: {
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
    html({
      minify: true
    })
  ],
  css: {
    postcss: {
      plugins: [
        require('postcss-purgecss')({
          content: ['./**/*.html'],
          defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
        })
      ]
    }
  }
}) 