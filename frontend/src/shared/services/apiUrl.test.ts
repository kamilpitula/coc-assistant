import { describe, expect, it, vi } from 'vitest'

import { apiUrl, buildApiUrl } from './apiUrl'

describe('buildApiUrl', () => {
  it('returns the path unchanged when the base URL is undefined', () => {
    expect(buildApiUrl(undefined, '/api/account/me')).toBe('/api/account/me')
  })

  it('returns the path unchanged when the base URL is empty', () => {
    expect(buildApiUrl('', '/api/account/me')).toBe('/api/account/me')
  })

  it('returns the path unchanged when the base URL is whitespace', () => {
    expect(buildApiUrl('   ', '/api/account/me')).toBe('/api/account/me')
  })

  it('prefixes the path with the base URL', () => {
    expect(buildApiUrl('https://api.example', '/api/account/me')).toBe('https://api.example/api/account/me')
  })

  it('strips a trailing slash from the base URL', () => {
    expect(buildApiUrl('https://api.example/', '/api/account/me')).toBe('https://api.example/api/account/me')
  })

  it('prefixes the hub URL the same way', () => {
    expect(buildApiUrl('https://api.example/', '/hubs/campaign')).toBe('https://api.example/hubs/campaign')
  })
})

describe('apiUrl', () => {
  it('returns the relative path when VITE_API_BASE_URL is unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    expect(apiUrl('/api/account/me')).toBe('/api/account/me')

    vi.unstubAllEnvs()
  })

  it('prefixes the path when VITE_API_BASE_URL is set', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example/')

    expect(apiUrl('/api/account/me')).toBe('https://api.example/api/account/me')

    vi.unstubAllEnvs()
  })
})
