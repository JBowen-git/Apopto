import { createContext, useContext } from 'react'

export const ApoptoAuthContext = createContext({
  error: undefined,
  isAuthenticated: false,
  isConfigured: false,
  isLoading: false,
  login: () => {},
  logout: () => {},
  user: undefined,
  getAccessToken: async () => undefined,
})

export function StaticApoptoAuthProvider({
  children,
  isConfigured = false,
  isLoading = false,
}) {
  return (
    <ApoptoAuthContext.Provider
      value={{
        error: undefined,
        isAuthenticated: false,
        isConfigured,
        isLoading,
        login: () => {},
        logout: () => {},
        user: undefined,
        getAccessToken: async () => undefined,
      }}
    >
      {children}
    </ApoptoAuthContext.Provider>
  )
}

export function useApoptoAuth() {
  return useContext(ApoptoAuthContext)
}
