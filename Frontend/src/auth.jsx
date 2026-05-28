import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import {
  auth0Audience,
  auth0ClientId,
  auth0Domain,
  hasAuth0Config,
} from './authConfig.js'
import { ApoptoAuthContext, StaticApoptoAuthProvider, useApoptoAuth } from './authContext.jsx'

const authReturnToKey = 'apopto.auth.returnTo'
const clientAuthScopeList = [
  'openid',
  'profile',
  'email',
  'read:me',
  'write:intake',
  'read:client',
  'write:client',
  'read:files',
  'write:files',
  'read:messages',
  'write:messages',
  'read:billing',
]

function authScope(extraScopes = []) {
  return [...new Set([...clientAuthScopeList, ...extraScopes])].join(' ')
}

function auth0AuthorizationParams(extraScopes = []) {
  const authorizationParams = {
    scope: authScope(extraScopes),
  }

  if (auth0Audience) {
    authorizationParams.audience = auth0Audience
  }

  return authorizationParams
}

function isInternalReturnTo(value) {
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.startsWith('/callback')
}

function rememberReturnTo(returnTo) {
  if (typeof window === 'undefined' || !isInternalReturnTo(returnTo)) {
    return
  }

  window.sessionStorage.setItem(authReturnToKey, returnTo)
}

function pendingReturnTo() {
  if (typeof window === 'undefined') {
    return undefined
  }

  const value = window.sessionStorage.getItem(authReturnToKey)

  return isInternalReturnTo(value) ? value : undefined
}

function Auth0Bridge({ children }) {
  const {
    error,
    getAccessTokenSilently,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0()

  const login = (returnTo = '/dashboard') => {
    rememberReturnTo(returnTo)

    return loginWithRedirect({
      appState: { returnTo },
      authorizationParams: {
        ...auth0AuthorizationParams(),
        redirect_uri: `${window.location.origin}/callback`,
      },
    })
  }

  const logoutAccount = () =>
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })

  return (
    <ApoptoAuthContext.Provider
      value={{
        error,
        isAuthenticated,
        isConfigured: true,
        isLoading,
        login,
        logout: logoutAccount,
        user,
        getAccessToken: (extraScopes = []) => getAccessTokenSilently({
          authorizationParams: auth0AuthorizationParams(extraScopes),
        }),
      }}
    >
      {children}
    </ApoptoAuthContext.Provider>
  )
}

export function ApoptoAuthProvider({ children }) {
  if (!hasAuth0Config || typeof window === 'undefined') {
    const isServerWithAuthConfig = hasAuth0Config && typeof window === 'undefined'

    return (
      <StaticApoptoAuthProvider
        isConfigured={hasAuth0Config}
        isLoading={isServerWithAuthConfig}
      >
        {children}
      </StaticApoptoAuthProvider>
    )
  }

  const authorizationParams = {
    ...auth0AuthorizationParams(),
    redirect_uri: `${window.location.origin}/callback`,
  }

  return (
    <Auth0Provider
      authorizationParams={authorizationParams}
      clientId={auth0ClientId}
      domain={auth0Domain}
      onRedirectCallback={(appState) => {
        const returnTo = isInternalReturnTo(appState?.returnTo)
          ? appState.returnTo
          : pendingReturnTo() ?? '/dashboard'

        window.history.replaceState({}, document.title, returnTo)
      }}
    >
      <Auth0Bridge>{children}</Auth0Bridge>
    </Auth0Provider>
  )
}

export { useApoptoAuth }
export default ApoptoAuthProvider
