import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Niente vite-plugin-pwa — usiamo manifest.json manuale
  // più semplice e funziona su Vercel senza configurazione extra
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Controlliamo se il modulo proviene da node_modules
          if (id.includes('node_modules')) {
            // Dividi in base al nome della libreria nel percorso
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
          }
        },
      },
    },
  },
})