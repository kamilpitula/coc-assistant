import { PublicClientApplication } from '@azure/msal-browser'

import { buildMsalConfig } from './buildMsalConfig'

export const msalConfig = buildMsalConfig(import.meta.env)

export const apiScope = import.meta.env.VITE_API_SCOPE ?? ''

export const msalInstance = new PublicClientApplication(msalConfig)
