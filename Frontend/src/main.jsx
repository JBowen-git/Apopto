import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { StaticApoptoAuthProvider } from './authContext.jsx'
import './index.css'

if (import.meta.env.DEV) {
  void import('./sharedPackageSmoke').then(({ verifySharedPackageImport }) => {
    verifySharedPackageImport()
  })
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found.')
}

const app = (
  <StrictMode>
    <StaticApoptoAuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StaticApoptoAuthProvider>
  </StrictMode>
)

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}
