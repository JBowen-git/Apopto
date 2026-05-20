import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ApoptoAuthProvider } from './auth.jsx'
import './index.css'
import { verifySharedPackageImport } from './sharedPackageSmoke.js'

verifySharedPackageImport()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found.')
}

const app = (
  <StrictMode>
    <ApoptoAuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApoptoAuthProvider>
  </StrictMode>
)

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}
