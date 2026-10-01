import type { Configuration, ProtocolMode } from '@azure/msal-browser'

/** Minimal env shape consumed by {@link buildMsalConfig}, so the function stays pure and testable. */
export interface MsalEnv {
  readonly VITE_ENTRA_CLIENT_ID?: string
  readonly VITE_ENTRA_AUTHORITY?: string
  readonly VITE_ENTRA_REDIRECT_URI?: string
  readonly VITE_API_SCOPE?: string
  readonly VITE_MSAL_PROTOCOL_MODE?: string
}

function hostFromAuthority(authority: string | undefined): string | null {
  if (!authority) {
    return null
  }
  try {
    return new URL(authority).host
  } catch {
    return null
  }
}

function fallbackRedirectUri(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

/**
 * Builds the MSAL {@link Configuration} from env values.
 *
 * Pure and environment-neutral: `knownAuthorities` is always derived from the authority host so
 * MSAL does not hit the AAD cloud-discovery endpoint, regardless of whether the authority is a
 * CIAM tenant, a workforce tenant, or the local E2E mock. `protocolMode` sits under MSAL's
 * `system` block and is only set when `VITE_MSAL_PROTOCOL_MODE` is non-empty, so production
 * defaults to MSAL's native AAD mode.
 */
export function buildMsalConfig(env: MsalEnv): Configuration {
  const authorityHost = hostFromAuthority(env.VITE_ENTRA_AUTHORITY)
  const protocolMode = env.VITE_MSAL_PROTOCOL_MODE?.trim()

  return {
    auth: {
      clientId: env.VITE_ENTRA_CLIENT_ID ?? '',
      authority: env.VITE_ENTRA_AUTHORITY ?? '',
      redirectUri: env.VITE_ENTRA_REDIRECT_URI ?? fallbackRedirectUri(),
      knownAuthorities: authorityHost ? [authorityHost] : [],
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
    ...(protocolMode
      ? { system: { protocolMode: protocolMode as ProtocolMode } }
      : {}),
  }
}
