import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const base = process.env.VITE_BASE_PATH || '/';
export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'Posiłki — prywatny dziennik', short_name: 'Posiłki',
      description: 'Prywatny dziennik posiłków i pomiarów zdrowotnych.',
      theme_color: '#163b37', background_color: '#f7f8f4', display: 'standalone',
      start_url: '.', scope: '.', lang: 'pl',
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      navigateFallback: `${base}index.html`,
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      maximumFileSizeToCacheInBytes: 5_000_000
    }
  })]
});
