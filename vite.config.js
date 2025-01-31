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
  },
  define: {
    __VERSION_FILE__: JSON.stringify(
      process.env.NODE_ENV === 'development' ? '/version.dev.json' : '/version.json'
    )
  }
}) 