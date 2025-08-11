import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173, // Default Vite port
    strictPort: true, // Exit if port is already in use
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit to 1000kb
  },
})
