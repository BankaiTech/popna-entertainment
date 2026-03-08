import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // so we can show "New version available. Reload?" via useRegisterSW
      includeAssets: ['Nexora.svg', 'Nexora Logo.png', 'Nexora Logo.svg'],
      manifest: false, // Managed manually via public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        // Allow large assets (e.g. hero image) to be precached; default is 2 MiB
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:3001\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 10,
            },
          },
          // Production API: cache list/data for offline; set VITE_API_ORIGIN or use same origin
          {
            urlPattern: /^\/(api|v1)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
