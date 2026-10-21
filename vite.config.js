import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Địa chỉ Backend Spring Boot (klcn) — mặc định chạy ở cổng 8080
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      // BE chỉ cho phép CORS từ 5173/5174 → cố định cổng 5173
      port: 5173,
      strictPort: true,
      // Proxy /api sang BE: FE gọi cùng origin → không còn lỗi CORS khi dev
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
