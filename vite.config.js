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
      // 127.0.0.1 explícito: en Windows "localhost" a veces resuelve a ::1 (IPv6)
      // y el backend Flask solo escucha en 127.0.0.1, lo que causa ECONNREFUSED.
      '/api': 'http://127.0.0.1:5050'
    }
  }
})
