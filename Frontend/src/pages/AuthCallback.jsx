import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from 'react-router-dom'
import { bootstrapPortalContext } from '../api/portalBootstrap'
import { useApiClient } from '../api/useApiClient'
import { useApoptoAuth } from '../auth.jsx'

export default function AuthCallback() {
  const { error, isAuthenticated, isConfigured, isLoading } = useApoptoAuth()
  const apiClient = useApiClient()
  const bootstrapQuery = useQuery({
    enabled: isConfigured && !isLoading && isAuthenticated,
    queryKey: ['me'],
    queryFn: () => bootstrapPortalContext(apiClient),
  })

  if (bootstrapQuery.isSuccess) {
    return <Navigate replace to="/dashboard" />
  }

  return (
    <section className="account-page" aria-labelledby="callback-title">
      <div className="account-card">
        <p className="account-eyebrow">Customer accounts</p>
        <h1 id="callback-title">Finishing sign in.</h1>

        {!isConfigured ? (
          <div className="account-status-panel">
            <h2>Auth0 needs configuration.</h2>
            <p>Add the Auth0 frontend environment variables before using customer sign in.</p>
            <code>Frontend/.env</code>
          </div>
        ) : null}

        {isConfigured && isLoading ? (
          <div className="account-status-panel">
            <h2>Checking your session.</h2>
            <p>Customer access is loading.</p>
          </div>
        ) : null}

        {isConfigured && !isLoading && isAuthenticated && bootstrapQuery.isLoading ? (
          <div className="account-status-panel">
            <h2>Preparing your dashboard.</h2>
            <p>Your portal access is being connected.</p>
          </div>
        ) : null}

        {isConfigured && (error || bootstrapQuery.isError) ? (
          <div className="account-status-panel account-status-panel-error">
            <h2>Authentication needs attention.</h2>
            <p>{error?.message ?? bootstrapQuery.error?.message ?? 'Your portal access could not be prepared.'}</p>
            <Link className="button secondary" to="/account">
              Return to account
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}
