export const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN ?? ''
export const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? ''
export const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE ?? ''
export const hasAuth0Config = Boolean(auth0Domain && auth0ClientId)
