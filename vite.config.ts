import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: './',
  server: {
    proxy: {
      // 将 /luoxu_api 开头的请求代理到你的VPS后端
      '/luoxu_api': {
        target: 'http://domian:9008', // 你的VPS后端地址
        changeOrigin: true, // 需要改变源
        rewrite: (path) => path.replace(/^\/luoxu_api/, '') // 重写路径，去掉 /luoxu_api 前缀
      }
    }
  }
})
