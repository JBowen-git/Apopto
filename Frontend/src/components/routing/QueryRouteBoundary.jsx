import { lazy, Suspense } from 'react'
import RouteLoadingFallback from './RouteLoadingFallback.jsx'

const AppQueryProvider = lazy(() => import('../../providers/AppQueryProvider'))

export default function QueryRouteBoundary({ children }) {
  if (typeof window === 'undefined') {
    return children
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <AppQueryProvider>{children}</AppQueryProvider>
    </Suspense>
  )
}
