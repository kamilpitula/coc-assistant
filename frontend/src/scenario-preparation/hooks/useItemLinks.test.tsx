import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'

import { useLinkItem, useUnlinkItem } from './useItemLinks'

// Specs ux.md sections 64.2 and 64.3: a confirmed link or unlink reloads the Scene, the Item's Scenes, and the Items list.

const api = vi.hoisted(() => ({ linkItem: vi.fn(), unlinkItem: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/itemLinkApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scenario-preparation/services/itemLinkApi')>()),
  ...api,
}))

const link = { id: 'l1', item: { id: 'k1', name: "Walter Corbitt's diary" } }

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('Item link hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links an Item with the token and ids, then reloads the Scene, the Item, and the list', async () => {
    api.linkItem.mockResolvedValue(link)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useLinkItem('c1', 's1', 'a1'), { wrapper })
    await act(() => result.current.mutateAsync('k1'))

    expect(api.linkItem).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'k1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.detail('c1', 'k1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.list('c1') })
  })

  it('unlinks with the token and ids, then reloads the Scene, the Item, and the list', async () => {
    api.unlinkItem.mockResolvedValue(undefined)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useUnlinkItem('c1', 's1', 'a1', { id: 'l1', itemId: 'k1' }), { wrapper })
    await act(() => result.current.mutateAsync())

    expect(api.unlinkItem).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'l1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.detail('c1', 'k1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.list('c1') })
  })
})
