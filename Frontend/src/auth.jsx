import { createContext, useContext } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN ?? ''
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? ''
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE ?? ''
const hasAuth0Config = Boolean(auth0Domain && auth0ClientId)

const ApoptoAuthContext = createContext({
  error: undefined,
  isAuthenticated: false,
  isConfigured: false,
  isLoading: false,
  login: () => {},
  logout: () => {},
  user: undefined,
})

function Auth0Bridge({ children }) {
  const { error, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0()

  const login = (returnTo = '/account') =>
    loginWithRedirect({
      appState: { returnTo },
    })

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
      <ApoptoAuthContext.Provider
        value={{
          error: undefined,
          isAuthenticated: false,
          isConfigured: hasAuth0Config,
          isLoading: isServerWithAuthConfig,
          login: () => {},
          logout: () => {},
          user: undefined,
        }}
      >
        {children}
      </ApoptoAuthContext.Provider>
    )
  }

  const authorizationParams = {
    redirect_uri: `${window.location.origin}/account`,
  }

  if (auth0Audience) {
    authorizationParams.audience = auth0Audience
  }

  return (
    <Auth0Provider
      authorizationParams={authorizationParams}
      clientId={auth0ClientId}
      domain={auth0Domain}
      onRedirectCallback={(appState) => {
        window.history.replaceState({}, document.title, appState?.returnTo ?? window.location.pathname)
      }}
    >
      <Auth0Bridge>{children}</Auth0Bridge>
    </Auth0Provider>
  )
}

export function useApoptoAuth() {
  return useContext(ApoptoAuthContext)
}
