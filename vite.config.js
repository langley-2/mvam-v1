import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react(), {
    name: 'production-csp',
    transformIndexHtml(html) {
      return command === 'build' ? html.replace(' http://localhost:* ws://localhost:*', '') : html
    },
  }],
  base: './',
  server: { host: '127.0.0.1' },
  build: { sourcemap: false },
}))
