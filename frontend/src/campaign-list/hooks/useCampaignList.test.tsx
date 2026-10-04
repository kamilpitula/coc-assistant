import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCampaignList } from './useCampaignList'

// specs/campaign-list/spec.md, Freshness: refetch on page load and when the window regains focus (CL-UX-11).

const { mockGetCampaignList } = vi.hoisted(() => ({ mockGetCampaignList: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/campaign-list/services/campaignListApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/campaign-list/services/campaignListApi')>()),
  getCampaignList: mockGetCampaignList,
}))

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useCampaignList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCampaignList.mockResolvedValue([])
  })

  afterEach(() => focusManager.setFocused(undefined))

  it('loads the list with an access token', async () => {
    const queryClient = new QueryClient()
    const { result } = renderHook(() => useCampaignList(), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockGetCampaignList).toHaveBeenCalledWith('token')
  })

  it('refetches when the window regains focus, even if the client does not by default', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })
    const { result } = renderHook(() => useCampaignList(), { wrapper: wrapperFor(queryClient) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(mockGetCampaignList).toHaveBeenCalledTimes(2))
  })
})
