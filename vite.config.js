import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Niente vite-plugin-pwa — usiamo manifest.json manuale
  // più semplice e funziona su Vercel senza configurazione extra
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts:   ['recharts'],
        },
      },
    },
  },
})