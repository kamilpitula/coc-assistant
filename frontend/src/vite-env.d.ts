/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENTRA_CLIENT_ID: string
  readonly VITE_ENTRA_AUTHORITY: string
  readonly VITE_ENTRA_REDIRECT_URI: string
  readonly VITE_API_SCOPE: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_MSAL_PROTOCOL_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
