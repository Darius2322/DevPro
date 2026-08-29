import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'DevPro',
        short_name: 'DevPro',
        description: 'Private workspace for organizing everything related to your software projects.',
        theme_color: '#12141a',
        background_color: '#12141a',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // Only precache the static app shell. Never cache API/storage responses
        // that could contain project data or secrets.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallbackDenylist: [/^\/rest\//, /^\/storage\//, /^\/functions\//]
      }
    })
  ],
  server: { port: 5173 }
})
