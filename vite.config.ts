import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  // Dev only: '/api' is forwarded to Django, so the browser sees one origin (no CORS setup needed).
  const devApiTarget = fileEnv.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000';

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // so we can show "New version available. Reload?" via useRegisterSW
      includeAssets: ['lcodesk-icon.png', 'lcodesk-icon-192.png', 'lcodesk-icon-512.png', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: false, // Managed manually via public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        // Allow large assets (e.g. hero image) to be precached; default is 2 MiB
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^(?!\/(api|v1))/],
        // API responses are NOT cached by the service worker on purpose: they contain customer data,
        // and on a shared phone the next staff member could otherwise read the previous user's data.
        runtimeCaching: [],
      },
      devOptions: {
        // Off in development: a dev service worker keeps old code and shows "New version" on every change.
        // Turn on only to test PWA install/offline: VITE_PWA_DEV=true in .env
        enabled: fileEnv.VITE_PWA_DEV === 'true',
        navigateFallbackDenylist: [/^\/api/, /^\/v1/],
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
    proxy: {
      '/api': { target: devApiTarget, changeOrigin: true },
    },
  },
  };
});
