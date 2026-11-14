/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "mediapipe/wasm/*",
        "models/*",
      ],
      manifest: {
        name: "AEGIS Space Med",
        short_name: "AEGIS",
        description: "Sistema de soporte a la decisión clínica y monitoreo offline para misiones espaciales profundas",
        theme_color: "#090d16",
        background_color: "#090d16",
        display: "standalone",
        orientation: "any",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,wasm,task,json}",
        ],
        // Soporte para archivos pesados: MediaPipe WASM (~14.6MB) y modelo (~3.76MB)
        maximumFileSizeToCacheInBytes: 35 * 1024 * 1024,
        navigateFallback: "/index.html",
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    host: "localhost",
  },
  optimizeDeps: {
    exclude: ["@mediapipe/tasks-vision"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
