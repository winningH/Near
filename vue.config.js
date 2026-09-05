const { defineConfig } = require('@vue/cli-service')

const API_PORT = process.env.PORT || 3001

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
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
