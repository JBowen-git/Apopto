import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { bootstrapPortalContext } from '../api/portalBootstrap'
import { useApiClient } from '../api/useApiClient'
import { useApoptoAuth } from '../auth.jsx'
import { resolvePostLoginReturnTo } from '../authToken'

export default function CustomerAccount() {
  const { error, getAccessToken, isAuthenticated, isConfigured, isLoading, login, logout, user } = useApoptoAuth()
  const apiClient = useApiClient()
  const landingQuery = useQuery({
    enabled: isConfigured && !isLoading && isAuthenticated,
    queryKey: ['postLoginLanding', 'account'],
    queryFn: async () => resolvePostLoginReturnTo('/dashboard', await getAccessToken()),
    staleTime: 30_000,
  })
  const bootstrapQuery = useQuery({
    enabled: landingQuery.isSuccess && landingQuery.data === '/dashboard',
    queryKey: ['me'],
    queryFn: () => bootstrapPortalContext(apiClient),
  })

  if (landingQuery.isSuccess && landingQuery.data !== '/dashboard') {
    return <Navigate replace to={landingQuery.data} />
  }

  if (bootstrapQuery.isSuccess) {
    return <Navigate replace to="/dashboard" />
  }

  return (
    <section className="account-page" aria-labelledby="account-title">
      <div className="account-card">
        <p className="account-eyebrow">Customer accounts</p>
        <h1 id="account-title">Project access starts here.</h1>

        {!isConfigured ? (
          <div className="account-status-panel">
            <h2>Auth0 is installed.</h2>
            <p>
              Add the Auth0 domain and client ID to the frontend environment, then this
              page becomes the customer login entry point.
            </p>
            <code>Frontend/.env.local</code>
          </div>
        ) : null}

        {isConfigured && isLoading ? (
          <div className="account-status-panel">
            <h2>Checking your session.</h2>
            <p>Customer access is loading.</p>
          </div>
        ) : null}

        {isConfigured && error ? (
          <div className="account-status-panel account-status-panel-error">
            <h2>Authentication needs attention.</h2>
            <p>{error.message}</p>
          </div>
        ) : null}

        {isConfigured && !isLoading && !isAuthenticated ? (
          <div className="account-signin-panel">
            <p>
              Sign in to access customer tools as they come online: project status,
              intake details, files, approvals, and account-specific updates.
            </p>
            <button className="account-primary-action" onClick={() => login('/dashboard')} type="button">
              Sign in or create account
              <span aria-hidden="true">-&gt;</span>
            </button>
          </div>
        ) : null}

        {isConfigured && !isLoading && isAuthenticated && (landingQuery.isLoading || bootstrapQuery.isLoading) ? (
          <div className="account-status-panel">
            <h2>Preparing your dashboard.</h2>
            <p>Your customer portal account is being connected.</p>
          </div>
        ) : null}

        {isConfigured && !isLoading && isAuthenticated && bootstrapQuery.isError ? (
          <div className="account-status-panel account-status-panel-error">
            <h2>Portal access needs attention.</h2>
            <p>{bootstrapQuery.error?.message ?? 'Your dashboard could not be prepared.'}</p>
            <button className="account-secondary-action" onClick={logout} type="button">
              Sign out
            </button>
          </div>
        ) : null}

        {isConfigured && !isLoading && isAuthenticated && !bootstrapQuery.isLoading && !bootstrapQuery.isError ? (
          <div className="account-dashboard-panel">
            <div className="account-profile">
              {user?.picture ? <img src={user.picture} alt="" /> : <span>{user?.name?.[0] ?? 'A'}</span>}
              <div>
                <h2>{user?.name ?? 'Customer account'}</h2>
                <p>{user?.email ?? 'Signed in with Auth0'}</p>
              </div>
            </div>
            <div className="account-dashboard-grid">
              <div>
                <span>Project hub</span>
                <strong>Coming next</strong>
              </div>
              <div>
                <span>Files</span>
                <strong>Ready soon</strong>
              </div>
              <div>
                <span>Messages</span>
                <strong>Planned</strong>
              </div>
            </div>
            <button className="account-secondary-action" onClick={logout} type="button">
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
