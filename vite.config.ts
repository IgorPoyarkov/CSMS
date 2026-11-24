import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    // Слушаем все интерфейсы: система открывается с другого устройства по IP.
    host: true,
    allowedHosts: true,
    // В dev проксируем API на csms-api и адаптер PostgreSQL: браузер видит
    // один origin и не зависит от CORS. Абсолютный VITE_EIS_API_URL работает.
    proxy: {
      // Консультант — отдельный локальный сервис; префикс должен совпадать
      // раньше общего /api, иначе запрос уйдёт в csms-api.
      "/api/consultant": {
        target: "http://localhost:5098",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5099",
        changeOrigin: true,
      },
      "/openapi": {
        target: "http://localhost:5099",
        changeOrigin: true,
      },
      "/pg-api": {
        target: "http://localhost:3002",
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/pg-api/, ""),
      },
    },
  },
  css: {
    devSourcemap: true,
    modules: {

      generateScopedName: "[local]__[hash:base64:4]",
    },
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(import.meta.dirname, "src/scss/global")],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
