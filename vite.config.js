import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 4200 es el puerto registrado en el Login Único para salud-web.
    port: 4200,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5050'
    }
  }
})
