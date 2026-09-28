import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Keeps the API on the same origin in development, so the backend can keep
    // CORS disabled.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
