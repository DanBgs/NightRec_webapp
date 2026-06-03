import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // 1. Importa il plugin PWA

export default defineConfig({
  plugins: [
    react(),
    // 2. Configura il plugin PWA
    VitePWA({
      registerType: 'autoUpdate', // Forzza l'aggiornamento automatico senza blocco della cache
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // Aggiungi eventuali asset statici della root
      manifest: {
        name: 'NightRecorder',
        short_name: 'NightRec',
        description: 'una applicazion per il monitoraggio delle bevande alcoliche in una serata',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('react-router-dom')) {
            return 'react'
          }
          if (id.includes('@supabase')) {
            return 'supabase'
          }
          if (id.includes('recharts')) {
            return 'charts'
          }
        },
      },
    },
  },
})