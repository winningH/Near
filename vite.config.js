import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const API_PORT = process.env.PORT || 3001

export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.CLIENT_PORT) || 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      },
      '/uploads': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      }
    }
  }
})
