import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { readStoredAccount, storeAccount } from '@/shared/services/storedAccount'

import { useAccountSync } from './useAccountSync'

const { mockUseIsAuthenticated, mockAcquireTokenSilent, mockFetchCurrentAccount } = vi.hoisted(() => ({
  mockUseIsAuthenticated: vi.fn(),
  mockAcquireTokenSilent: vi.fn(),
  mockFetchCurrentAccount: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: mockUseIsAuthenticated,
  useMsal: () => ({
    instance: { acquireTokenSilent: mockAcquireTokenSilent },
    accounts: [{ homeAccountId: 'account-1' }],
  }),
}))

vi.mock('@/shared/services/accountApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/services/accountApi')>()),
  fetchCurrentAccount: mockFetchCurrentAccount,
}))

const storedKeeper = { id: '1', displayName: 'Old Name', email: 'keeper@example.com' }
const freshKeeper = { id: '1', displayName: 'Keeper One', email: 'keeper@example.com' }

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useAccountSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mockUseIsAuthenticated.mockReturnValue(true)
    mockAcquireTokenSilent.mockResolvedValue({ accessToken: 'token-1' })
  })

  it('uses the stored Account while GET /api/account/me is pending (UX-AUTH-3)', () => {
    storeAccount(storedKeeper)
    mockFetchCurrentAccount.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useAccountSync(), { wrapper })

    expect(result.current.data).toEqual(storedKeeper)
    expect(result.current.isPlaceholderData).toBe(true)
  })

  it('replaces the stored Account with the fetched one and stores it', async () => {
    storeAccount(storedKeeper)
    mockFetchCurrentAccount.mockResolvedValue(freshKeeper)

    const { result } = renderHook(() => useAccountSync(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(freshKeeper))
    expect(mockFetchCurrentAccount).toHaveBeenCalledWith('token-1')
    expect(readStoredAccount()).toEqual(freshKeeper)
  })

  it('does not call the API when signed out', () => {
    mockUseIsAuthenticated.mockReturnValue(false)

    renderHook(() => useAccountSync(), { wrapper })

    expect(mockAcquireTokenSilent).not.toHaveBeenCalled()
  })
})
