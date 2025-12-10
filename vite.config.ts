import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    cloudflare(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '我的个人导航站',
        short_name: '导航站',
        description: '我的个人专属导航站',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
        ]
      }
    })
  ],
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': [
            '@mui/material', 
            '@mui/icons-material', 
            '@emotion/react', 
            '@emotion/styled'
          ],
          'dnd-vendor': [
            '@dnd-kit/core', 
            '@dnd-kit/sortable', 
            '@dnd-kit/utilities'
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000, 
  },
})
