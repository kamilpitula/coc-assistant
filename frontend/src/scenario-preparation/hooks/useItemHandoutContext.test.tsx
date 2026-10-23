import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ItemHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { diaryLinkedTo } from '@/scenario-preparation/test-support/itemFixtures'

import { useItemHandoutContext } from './useItemHandoutContext'

// Design record PBI-SP-008, D3: the Item query and what the Handout screens may do, until the Item has loaded.

const { mockUseItem, refetch } = vi.hoisted(() => ({ mockUseItem: vi.fn(), refetch: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItem: mockUseItem }))

const owner: ItemHandoutOwner = { type: 'item', campaignId: 'c1', itemId: 'k1' }

describe('useItemHandoutContext', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks for the Item of the owner, only when enabled', () => {
    mockUseItem.mockReturnValue({ data: undefined, refetch })

    renderHook(() => useItemHandoutContext(owner, false))

    expect(mockUseItem).toHaveBeenLastCalledWith('c1', 'k1', false)
  })

  it('has no context until the Item has loaded, and none for an unknown Item', () => {
    mockUseItem.mockReturnValue({ data: undefined, refetch })
    expect(renderHook(() => useItemHandoutContext(owner, true)).result.current.context).toBeNull()

    mockUseItem.mockReturnValue({ data: null, refetch })
    expect(renderHook(() => useItemHandoutContext(owner, true)).result.current.context).toBeNull()
  })

  it('builds the context of the loaded Item and reloads the Item from it', () => {
    mockUseItem.mockReturnValue({ data: diaryLinkedTo('Active'), refetch })

    const { result } = renderHook(() => useItemHandoutContext(owner, true))
    result.current.context?.refetchOwner()

    expect(result.current.context).toMatchObject({ ownerName: "Walter Corbitt's diary", canChange: true, canDelete: false })
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
