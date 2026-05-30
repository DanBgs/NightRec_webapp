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
          // Normalizziamo i separatori di percorso per evitare problemi tra Windows (\\) e Linux (/)
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('node_modules')) {
            // Separa core React e Router
            if (
              normalizedId.includes('/node_modules/react/') || 
              normalizedId.includes('/node_modules/react-dom/') || 
              normalizedId.includes('/node_modules/react-router-dom/')
            ) {
              return 'react';
            }
            // Separa Supabase
            if (normalizedId.includes('/node_modules/@supabase/')) {
              return 'supabase';
            }
            // Separa i grafici
            if (normalizedId.includes('/node_modules/recharts/')) {
              return 'charts';
            }
          }
        },
      },
    },
  },
})