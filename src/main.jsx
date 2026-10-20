import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import './index.css'
import App from './App.jsx'
import { AvisosProvider } from './components/Avisos'
import { oidcConfig } from './auth'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <AvisosProvider>
        <App />
      </AvisosProvider>
    </AuthProvider>
  </StrictMode>,
)

// App instalable (PWA): el service worker solo muestra "Sin conexión" si se cae el internet;
// no guarda datos. En desarrollo no se registra para no estorbar la recarga de Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
