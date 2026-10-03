import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'

import { useApproveInvestigator, useRequestChanges } from './useKeeperInvestigators'

const { mockApprove, mockRequestChanges } = vi.hoisted(() => ({
  mockApprove: vi.fn(),
  mockRequestChanges: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))

vi.mock('@/campaign-play/services/investigatorApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/campaign-play/services/investigatorApi')>()),
  approveInvestigator: mockApprove,
  requestChanges: mockRequestChanges,
}))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useKeeperInvestigators mutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores the approved Investigator and reloads the list', async () => {
    mockApprove.mockResolvedValue({ id: 'i1', status: 'Approved' })
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useApproveInvestigator('c1', 'i1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(queryClient.getQueryData(campaignQueryKeys.investigator('c1', 'i1'))).toEqual({ id: 'i1', status: 'Approved' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: campaignQueryKeys.investigators('c1'), exact: true })
  })

  it('sends the comment when requesting changes and stores the result', async () => {
    mockRequestChanges.mockResolvedValue({ id: 'i1', status: 'ChangesRequested' })
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useRequestChanges('c1', 'i1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('Lower the Credit Rating')
    })

    expect(mockRequestChanges).toHaveBeenCalledWith('token', 'c1', 'i1', 'Lower the Credit Rating')
    expect(queryClient.getQueryData(campaignQueryKeys.investigator('c1', 'i1'))).toEqual({ id: 'i1', status: 'ChangesRequested' })
  })
})
