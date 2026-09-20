import { PublicClientApplication, type Configuration } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID ?? ''
const authority = import.meta.env.VITE_ENTRA_AUTHORITY ?? ''
const redirectUri = import.meta.env.VITE_ENTRA_REDIRECT_URI ?? window.location.origin

export const apiScope = import.meta.env.VITE_API_SCOPE ?? ''

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    redirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)
