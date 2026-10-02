import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiScope } from '@/shared/services/msalConfig'

import { useAccessToken } from './useAccessToken'

const { mockUseMsal, mockAcquireTokenSilent } = vi.hoisted(() => ({
  mockUseMsal: vi.fn(),
  mockAcquireTokenSilent: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({ useMsal: mockUseMsal }))

describe('useAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMsal.mockReturnValue({
      instance: { acquireTokenSilent: mockAcquireTokenSilent },
      accounts: [{ homeAccountId: 'account-1' }],
    })
    mockAcquireTokenSilent.mockResolvedValue({ accessToken: 'token-1' })
  })

  it('acquires an API access token silently for the signed-in account', async () => {
    const { result } = renderHook(() => useAccessToken())

    const token = await result.current()

    expect(token).toBe('token-1')
    expect(mockAcquireTokenSilent).toHaveBeenCalledWith({
      scopes: [apiScope],
      account: { homeAccountId: 'account-1' },
    })
  })
})
