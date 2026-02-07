import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Handle dynamic API URL based on current hostname
if (import.meta.env.MODE === 'tailscale') {
  const currentHost = window.location.hostname;
  console.log('Detected Tailscale mode, setting API URL to host:', currentHost);
  (import.meta as any).env.VITE_API_URL = `http://${currentHost}:3001`;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
