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
