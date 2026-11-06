import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { heldItemsQueryKeys } from '@/scene-play/services/itemHolderApi'
import type { InvestigatorHeldItems, MyHeldItems } from '@/scene-play/services/itemHolderApi'

import { useGiveItem, useInvestigatorHeldItems, useMyHeldItems, useTakeBackItem } from './useHeldItems'

// PBI-SPL-003: giving and taking back an Item changes who holds it everywhere it shows (Item panel, Scene, Clues).
const { mockMine, mockInvestigator, mockGive, mockTakeBack } = vi.hoisted(() => ({
  mockMine: vi.fn(),
  mockInvestigator: vi.fn(),
  mockGive: vi.fn(),
  mockTakeBack: vi.fn(),
}))
vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scene-play/services/itemHolderApi', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMyHeldItems: mockMine,
  getInvestigatorHeldItems: mockInvestigator,
  giveItem: mockGive,
  takeBackItem: mockTakeBack,
}))

const mine: MyHeldItems = {
  investigatorName: 'Harvey Walters',
  items: [{ revealId: 'r1', name: "Walter Corbitt's diary", description: { root: { type: 'root', children: [] } }, givenAt: '2026-10-28T19:52:00Z' }],
}

const keeper: InvestigatorHeldItems = {
  investigatorName: 'Harvey Walters',
  items: [{ itemId: 'k1', ...mine.items[0] }],
}

describe('held Items hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  const setup = () => {
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    return { client, invalidate, wrapper }
  }

  it("reads the caller's Investigator's Items under the mine held-Items key", async () => {
    mockMine.mockResolvedValue(mine)
    const { wrapper } = setup()

    const { result } = renderHook(() => useMyHeldItems('c1', true), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mine))
    expect(mockMine).toHaveBeenCalledWith('token', 'c1')
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0)
  })

  it("reads an Investigator's Items under its held-Items key for the Keeper", async () => {
    mockInvestigator.mockResolvedValue(keeper)
    const { wrapper } = setup()

    const { result } = renderHook(() => useInvestigatorHeldItems('c1', 'i1', true), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(keeper))
    expect(mockInvestigator).toHaveBeenCalledWith('token', 'c1', 'i1')
  })

  it('gives with the token, then refetches the held Items, the Active Scene, the Items, and the Scenes', async () => {
    mockGive.mockResolvedValue({ revealId: 'r1' })
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useGiveItem('c1'), { wrapper })

    await act(async () => result.current.mutateAsync({ itemId: 'k1', investigatorId: 'i1' }))

    expect(mockGive).toHaveBeenCalledWith('token', 'c1', 'k1', 'i1')
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: heldItemsQueryKeys.all('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activeSceneQueryKeys.detail('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.all('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.inCampaign('c1') })
  })

  it('takes back with the token, then refetches the held Items, the Active Scene, the Items, and the Scenes', async () => {
    mockTakeBack.mockResolvedValue(undefined)
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useTakeBackItem('c1'), { wrapper })

    await act(async () => result.current.mutateAsync('k1'))

    expect(mockTakeBack).toHaveBeenCalledWith('token', 'c1', 'k1')
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: heldItemsQueryKeys.all('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activeSceneQueryKeys.detail('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.all('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.inCampaign('c1') })
  })
})
