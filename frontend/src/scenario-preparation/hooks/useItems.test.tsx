import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Item, ItemInput, ItemSummary } from '@/scenario-preparation/types/Item'
import type { RichTextDocument } from '@/shared/types/RichText'

import { useCreateItem, useDeleteItem, useEditItem, useItem, useItems } from './useItems'

// Design record PBI-SP-008: Keeper-gated queries, confirmed (not optimistic) updates, and the lists a write changes reload.

const api = vi.hoisted(() => ({
  getItems: vi.fn(),
  getItem: vi.fn(),
  createItem: vi.fn(),
  editItem: vi.fn(),
  deleteItem: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/itemApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scenario-preparation/services/itemApi')>()),
  ...api,
}))

const summary: ItemSummary = { id: 'k1', name: "Walter Corbitt's diary", sceneCount: 1 }
const description: RichTextDocument = { root: { type: 'root', children: [] } }
const diary: Item = {
  id: 'k1',
  name: "Walter Corbitt's diary",
  playerFacingDescription: description,
  keeperNotes: null,
  holder: null,
  handouts: [],
  scenes: [{ scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status: 'Prepared' }],
}
const input: ItemInput = { name: "Walter Corbitt's diary", playerFacingDescription: description, keeperNotes: null }

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('Item hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the Campaign list and one Item when enabled', async () => {
    api.getItems.mockResolvedValue([summary])
    api.getItem.mockResolvedValue(diary)
    const { wrapper } = setup()

    const list = renderHook(() => useItems('c1', true), { wrapper })
    const one = renderHook(() => useItem('c1', 'k1', true), { wrapper })

    await waitFor(() => expect(list.result.current.data).toEqual([summary]))
    await waitFor(() => expect(one.result.current.data).toEqual(diary))
    expect(api.getItems).toHaveBeenCalledWith('token', 'c1')
    expect(api.getItem).toHaveBeenCalledWith('token', 'c1', 'k1')
  })

  it('sends no request for a Player (disabled)', () => {
    const { wrapper } = setup()

    const list = renderHook(() => useItems('c1', false), { wrapper })
    const one = renderHook(() => useItem('c1', 'k1', false), { wrapper })

    expect(list.result.current.fetchStatus).toBe('idle')
    expect(one.result.current.fetchStatus).toBe('idle')
    expect(api.getItems).not.toHaveBeenCalled()
    expect(api.getItem).not.toHaveBeenCalled()
  })

  it('creates an Item, caches it under its id, and reloads the list', async () => {
    api.createItem.mockResolvedValue(diary)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreateItem('c1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(api.createItem).toHaveBeenCalledWith('token', 'c1', input)
    expect(client.getQueryData(itemQueryKeys.detail('c1', 'k1'))).toEqual(diary)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.list('c1') })
  })

  it('saves an Item, replaces the cached one, and reloads the list and each Scene that links it', async () => {
    api.editItem.mockResolvedValue({ ...diary, name: 'The diary' })
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useEditItem('c1', 'k1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(api.editItem).toHaveBeenCalledWith('token', 'c1', 'k1', input)
    expect(client.getQueryData(itemQueryKeys.detail('c1', 'k1'))).toEqual({ ...diary, name: 'The diary' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.list('c1') })
  })

  it('deletes an Item, drops its cache entry, and reloads the list and the Scene pages', async () => {
    api.deleteItem.mockResolvedValue(undefined)
    const { client, wrapper } = setup()
    client.setQueryData(itemQueryKeys.detail('c1', 'k1'), diary)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteItem('c1', 'k1'), { wrapper })
    await act(() => result.current.mutateAsync())

    expect(api.deleteItem).toHaveBeenCalledWith('token', 'c1', 'k1')
    expect(client.getQueryData(itemQueryKeys.detail('c1', 'k1'))).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.inCampaign('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: itemQueryKeys.list('c1') })
  })
})
