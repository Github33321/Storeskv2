import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy helps избежать CORS и работает с cookie-корзиной.
// При необходимости задайте VITE_PROXY_TARGET=http://<host>:<port>
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:8082'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: proxyTarget, changeOrigin: true },
      '/media': { target: proxyTarget, changeOrigin: true }
    }
  }
})
