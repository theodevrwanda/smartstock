import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),

    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pixelmart.png"],
      manifest: {
        name: "PixelMart",
        short_name: "PixelMart",
        description: "Offline-first inventory system",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0f172a",
        icons: [
          {
            src: "/pixelmart.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable", // ensures OS can apply rounded corners
          },
          {
            src: "/pixelmart.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          // Optional: include higher-res icon for retina displays
          {
            src: "/pixelmart.png",
            sizes: "1024x1024",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
