import { describe, expect, it } from 'vitest'

import { buildMsalConfig } from './buildMsalConfig'

describe('buildMsalConfig', () => {
  const prodLikeEnv = {
    VITE_ENTRA_CLIENT_ID: 'client-prod',
    VITE_ENTRA_AUTHORITY: 'https://cocassistant.ciamlogin.com/tenant-prod',
    VITE_ENTRA_REDIRECT_URI: 'https://app.example.com',
    VITE_API_SCOPE: 'api://client-prod/access_as_user',
  }

  const e2eLikeEnv = {
    VITE_ENTRA_CLIENT_ID: 'client-e2e',
    VITE_ENTRA_AUTHORITY: 'https://localhost:8443/tenant-e2e/v2.0',
    VITE_ENTRA_REDIRECT_URI: 'http://localhost:5174',
    VITE_API_SCOPE: 'api://client-e2e/access_as_user',
  }

  it('carries clientId, authority, and redirectUri from env', () => {
    const config = buildMsalConfig(prodLikeEnv)

    expect(config.auth.clientId).toBe('client-prod')
    expect(config.auth.authority).toBe('https://cocassistant.ciamlogin.com/tenant-prod')
    expect(config.auth.redirectUri).toBe('https://app.example.com')
  })

  it('derives knownAuthorities from the authority host for a cloud authority', () => {
    const config = buildMsalConfig(prodLikeEnv)

    expect(config.auth.knownAuthorities).toEqual(['cocassistant.ciamlogin.com'])
  })

  it('derives knownAuthorities from the authority host for a localhost authority', () => {
    const config = buildMsalConfig(e2eLikeEnv)

    expect(config.auth.knownAuthorities).toEqual(['localhost:8443'])
  })

  it('leaves protocolMode unset when the env var is empty', () => {
    const config = buildMsalConfig(prodLikeEnv)

    expect(config.system?.protocolMode).toBeUndefined()
  })

  it('sets protocolMode to OIDC when VITE_MSAL_PROTOCOL_MODE is "OIDC"', () => {
    const config = buildMsalConfig({ ...e2eLikeEnv, VITE_MSAL_PROTOCOL_MODE: 'OIDC' })

    expect(config.system?.protocolMode).toBe('OIDC')
  })

  it('keeps session storage as the cache location', () => {
    const config = buildMsalConfig(prodLikeEnv)

    expect(config.cache?.cacheLocation).toBe('sessionStorage')
  })

  it('omits knownAuthorities when the authority is empty', () => {
    const config = buildMsalConfig({ ...prodLikeEnv, VITE_ENTRA_AUTHORITY: '' })

    expect(config.auth.knownAuthorities).toEqual([])
  })
})
