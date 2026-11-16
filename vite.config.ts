import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
