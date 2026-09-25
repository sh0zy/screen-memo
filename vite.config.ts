import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages のプロジェクトページ配信 (https://<user>.github.io/screen-memo/) に合わせる。
// 独自ドメインや <user>.github.io リポジトリに移すときは '/' に戻す。
const BASE = process.env.VITE_BASE ?? '/screen-memo/';

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-180.png'],
      manifest: {
        name: 'Screen Memo',
        short_name: 'Screen Memo',
        description: '今日やることを1画面にまとめて、スクショでロック画面に。',
        lang: 'ja',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        // 先頭の '/' を付けない: manifest の位置 (= base) からの相対で解決される
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('html-to-image')) return 'png';
          if (id.includes('@dnd-kit')) return 'dnd';
          return undefined;
        },
      },
    },
  },
});
