import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf8')
)
const version = 'v' + packageJson.version

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
      minify: true,
      inject: {
        data: {
          VERSION: version
        }
      }
    })
  ],
  css: {
    postcss: {
      plugins: [
      ]
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(version)
  }
}) 