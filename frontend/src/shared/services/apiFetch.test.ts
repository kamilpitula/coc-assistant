import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiFetch } from './apiFetch'

describe('apiFetch', () => {
  const fetchMock = vi.fn<typeof fetch>()

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    fetchMock.mockReset()
  })

  it('calls fetch with the relative URL when VITE_API_BASE_URL is unset', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_API_BASE_URL', '')
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/account/me', { headers: { Authorization: 'Bearer token' } })

    expect(fetchMock).toHaveBeenCalledWith('/api/account/me', { headers: { Authorization: 'Bearer token' } })
  })

  it('calls fetch with the prefixed URL when VITE_API_BASE_URL is set', async () => {
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example/')
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/account/me')

    expect(fetchMock).toHaveBeenCalledWith('https://api.example/api/account/me', undefined)
  })
})
