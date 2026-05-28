import { lazy, Suspense } from 'react'
import { hasAuth0Config } from '../../authConfig.js'
import { StaticApoptoAuthProvider } from '../../authContext.jsx'

const Auth0Provider = lazy(() => import('../../auth.jsx'))

export default function AuthRouteBoundary({ children }) {
  if (!hasAuth0Config || typeof window === 'undefined') {
    return (
      <StaticApoptoAuthProvider
        isConfigured={hasAuth0Config}
        isLoading={hasAuth0Config && typeof window === 'undefined'}
      >
        {children}
      </StaticApoptoAuthProvider>
    )
  }

  return (
    <Suspense
      fallback={
        <StaticApoptoAuthProvider isConfigured isLoading>
          {children}
        </StaticApoptoAuthProvider>
      }
    >
      <Auth0Provider>{children}</Auth0Provider>
    </Suspense>
  )
}
