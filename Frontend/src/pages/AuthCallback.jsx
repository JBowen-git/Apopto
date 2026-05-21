import { Link, Navigate } from 'react-router-dom'
import { useApoptoAuth } from '../auth.jsx'

export default function AuthCallback() {
  const { error, isAuthenticated, isConfigured, isLoading } = useApoptoAuth()

  if (isConfigured && !isLoading && isAuthenticated) {
    return <Navigate replace to="/account" />
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

        {isConfigured && error ? (
          <div className="account-status-panel account-status-panel-error">
            <h2>Authentication needs attention.</h2>
            <p>{error.message}</p>
            <Link className="button secondary" to="/account">
              Return to account
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}
