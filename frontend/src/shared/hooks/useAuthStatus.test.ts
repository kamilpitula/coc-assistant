import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStatus } from './useAuthStatus'

// specs/campaign-list/ux.md section 4 (MSAL resolving, Signed out) and section 5 (redirect from /).

const { mockUseIsAuthenticated, msalState } = vi.hoisted(() => ({
  mockUseIsAuthenticated: vi.fn(),
  msalState: { inProgress: 'none' },
}))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: mockUseIsAuthenticated,
  useMsal: () => ({ inProgress: msalState.inProgress }),
}))

describe('useAuthStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is resolving while MSAL starts up, even if an Account is cached', () => {
    msalState.inProgress = 'startup'
    mockUseIsAuthenticated.mockReturnValue(true)

    expect(renderHook(() => useAuthStatus()).result.current).toBe('resolving')
  })

  it('is signed in once MSAL settles with an Account', () => {
    msalState.inProgress = 'none'
    mockUseIsAuthenticated.mockReturnValue(true)

    expect(renderHook(() => useAuthStatus()).result.current).toBe('signedIn')
  })

  it('is signed out once MSAL settles without an Account', () => {
    msalState.inProgress = 'none'
    mockUseIsAuthenticated.mockReturnValue(false)

    expect(renderHook(() => useAuthStatus()).result.current).toBe('signedOut')
  })
})
