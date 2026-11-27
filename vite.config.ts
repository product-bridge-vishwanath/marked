/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// On GitHub Pages a project site is served from /<repo>/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Daymarks',
        short_name: 'Daymarks',
        description: 'Mark the days you did your activities and see your progress.',
        theme_color: '#6d5efc',
        background_color: '#f7f7fb',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // A timezone with DST so the date tests exercise the clock-change edge cases.
    env: { TZ: 'America/New_York' },
  },
});
