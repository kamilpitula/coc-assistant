import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { rollRequestQueryKeys } from '@/roll-requests/services/rollRequestApi'
import type { RollRequest } from '@/roll-requests/types/RollRequest'

import { useMyRequestedRolls, useRequestRoll, useRollRequestedRoll } from './useRollRequests'

const { mockGetMine, mockRequestRoll, mockRollRequestedRoll } = vi.hoisted(() => ({
  mockGetMine: vi.fn(),
  mockRequestRoll: vi.fn(),
  mockRollRequestedRoll: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))

vi.mock('@/roll-requests/services/rollRequestApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/roll-requests/services/rollRequestApi')>()),
  getMyRequestedRolls: mockGetMine,
  requestRoll: mockRequestRoll,
  rollRequestedRoll: mockRollRequestedRoll,
}))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

const created: RollRequest = {
  id: 'r1',
  target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
  message: 'Something moves upstairs.',
  visibility: 'Public',
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 0,
  createdAt: '2026-11-12T19:21:00Z',
  requestedRolls: [],
}

// specs/roll-requests/ux.md sections 5 and 6; RR-UX-6, RR-UX-9.
describe('roll request queries and mutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the calling Player waiting rolls through the mine key', async () => {
    mockGetMine.mockResolvedValue({ investigatorName: 'Harvey Walters', rolls: [] })
    const { wrapper } = setup()

    const { result } = renderHook(() => useMyRequestedRolls('c1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual({ investigatorName: 'Harvey Walters', rolls: [] }))
    expect(mockGetMine).toHaveBeenCalledWith('token', 'c1')
  })

  it('stores the created request and refetches the requests, the Wall, and the preview after requesting', async () => {
    mockRequestRoll.mockResolvedValue(created)
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRequestRoll('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        target: created.target,
        visibility: 'Public',
        difficulty: 'Regular',
        bonusDice: 0,
        penaltyDice: 0,
        investigators: [],
      })
    })

    expect(queryClient.getQueryData(rollRequestQueryKeys.detail('c1', 'r1'))).toEqual(created)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: rollRequestQueryKeys.all('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: campaignQueryKeys.wall('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: campaignQueryKeys.wallPreview('c1') })
  })

  it('refetches every Roll Request query after a roll, and leaves the Wall alone', async () => {
    mockRollRequestedRoll.mockResolvedValue({ investigatorId: 'i1', status: 'Rolled', rolls: [] })
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useRollRequestedRoll('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ rollRequestId: 'r1', investigatorId: 'i1' })
    })

    expect(mockRollRequestedRoll).toHaveBeenCalledWith('token', 'c1', 'r1', 'i1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: rollRequestQueryKeys.all('c1') })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: campaignQueryKeys.wall('c1') })
  })
})
