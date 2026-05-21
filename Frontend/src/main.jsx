import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ApoptoAuthProvider } from './auth.jsx'
import './index.css'
import AppQueryProvider from './providers/AppQueryProvider'
import { verifySharedPackageImport } from './sharedPackageSmoke'

verifySharedPackageImport()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found.')
}

const app = (
  <StrictMode>
    <ApoptoAuthProvider>
      <AppQueryProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppQueryProvider>
    </ApoptoAuthProvider>
  </StrictMode>
)

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}
