import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    // В dev проксируем API на csms-api: браузер видит один origin и не
    // зависит от CORS. Абсолютный VITE_EIS_API_URL по-прежнему работает.
    proxy: {
      "/api": {
        target: "http://localhost:5099",
        changeOrigin: true,
      },
      "/openapi": {
        target: "http://localhost:5099",
        changeOrigin: true,
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
        loadPaths: [path.resolve(__dirname, "src/scss/global")],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
