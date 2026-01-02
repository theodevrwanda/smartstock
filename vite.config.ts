import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",

      includeAssets: ["smartstock.png"],

      manifest: {
        name: "SmartStock",
        short_name: "SmartStock",
        description: "Intelligent Inventory & Financial Management System",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#FCD34D",
        icons: [
          {
            src: "/smartstock.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/smartstock.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ];

  // Only add tagger in development
  if (mode === "development") {
    plugins.push(componentTagger() as any);
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },

    plugins,

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
