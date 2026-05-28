import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApoptoAuth } from '../auth.jsx'
import { resolvePostLoginReturnTo } from '../authToken'

const authReturnToKey = 'apopto.auth.returnTo'

function callbackReturnTo() {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }

  const returnTo = window.sessionStorage.getItem(authReturnToKey)
  window.sessionStorage.removeItem(authReturnToKey)

  return typeof returnTo === 'string'
    && returnTo.startsWith('/')
    && !returnTo.startsWith('//')
    && !returnTo.startsWith('/callback')
    ? returnTo
    : '/dashboard'
}

export default function AuthCallback() {
  const { error, getAccessToken, isAuthenticated, isConfigured, isLoading } = useApoptoAuth()
  const [returnTo, setReturnTo] = useState(null)

  useEffect(() => {
    if (!isConfigured || isLoading || !isAuthenticated || error) {
      return undefined
    }

    let ignore = false

    async function resolveReturnTo() {
      const fallbackReturnTo = callbackReturnTo()
      const token = await getAccessToken()
      const resolvedReturnTo = resolvePostLoginReturnTo(fallbackReturnTo, token)

      if (!ignore) {
        setReturnTo(resolvedReturnTo)
      }
    }

    void resolveReturnTo()

    return () => {
      ignore = true
    }
  }, [error, getAccessToken, isAuthenticated, isConfigured, isLoading])

  if (returnTo) {
    return <Navigate replace to={returnTo} />
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

        {isConfigured && !isLoading && isAuthenticated ? (
          <div className="account-status-panel">
            <h2>Sign in is complete.</h2>
            <p>Opening your secure workspace.</p>
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
