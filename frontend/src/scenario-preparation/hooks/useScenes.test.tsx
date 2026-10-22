import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sceneQueryKeys, StaleSceneOrderError } from '@/scenario-preparation/services/sceneApi'
import type { Scene, SceneSummary } from '@/scenario-preparation/types/Scene'

import { useCreateScene, useEditScene, useRemoveScene, useReorderScenes, useScene, useScenes } from './useScenes'

// Design record: Keeper-gated queries, confirmed (not optimistic) updates, a refetch after a stale order.

const api = vi.hoisted(() => ({
  getScenes: vi.fn(),
  getScene: vi.fn(),
  createScene: vi.fn(),
  editScene: vi.fn(),
  removeScene: vi.fn(),
  reorderScenes: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/sceneApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scenario-preparation/services/sceneApi')>()),
  ...api,
}))

const knott: SceneSummary = { id: 'a1', title: 'Meeting Knott', status: 'Prepared', startedAt: null, finishedAt: null }
const detail: Scene = { ...knott, location: '', keeperNotes: null, nonPlayerEntityLinks: [] }
const input = { title: 'Meeting Knott', location: '', keeperNotes: null }

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('Scene hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the Scenario list and one Scene when enabled', async () => {
    api.getScenes.mockResolvedValue([knott])
    api.getScene.mockResolvedValue(detail)
    const { wrapper } = setup()

    const list = renderHook(() => useScenes('c1', 's1', true), { wrapper })
    const one = renderHook(() => useScene('c1', 's1', 'a1', true), { wrapper })

    await waitFor(() => expect(list.result.current.data).toEqual([knott]))
    await waitFor(() => expect(one.result.current.data).toEqual(detail))
    expect(api.getScenes).toHaveBeenCalledWith('token', 'c1', 's1')
    expect(api.getScene).toHaveBeenCalledWith('token', 'c1', 's1', 'a1')
  })

  it('sends no request for a Player (disabled)', () => {
    const { wrapper } = setup()

    renderHook(() => useScenes('c1', 's1', false), { wrapper })
    renderHook(() => useScene('c1', 's1', 'a1', false), { wrapper })

    expect(api.getScenes).not.toHaveBeenCalled()
    expect(api.getScene).not.toHaveBeenCalled()
  })

  it('caches the created Scene and invalidates the list', async () => {
    api.createScene.mockResolvedValue(detail)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreateScene('c1', 's1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(client.getQueryData(sceneQueryKeys.detail('c1', 's1', 'a1'))).toEqual(detail)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.list('c1', 's1') })
  })

  it('replaces the cached Scene with the confirmed one after an edit', async () => {
    api.editScene.mockResolvedValue({ ...detail, title: 'Knott' })
    const { client, wrapper } = setup()

    const { result } = renderHook(() => useEditScene('c1', 's1', 'a1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(client.getQueryData(sceneQueryKeys.detail('c1', 's1', 'a1'))).toMatchObject({ title: 'Knott' })
  })

  it('drops the cached Scene and invalidates the list after a removal', async () => {
    api.removeScene.mockResolvedValue(undefined)
    const { client, wrapper } = setup()
    client.setQueryData(sceneQueryKeys.detail('c1', 's1', 'a1'), detail)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useRemoveScene('c1', 's1', 'a1'), { wrapper })
    await act(() => result.current.mutateAsync())

    expect(client.getQueryData(sceneQueryKeys.detail('c1', 's1', 'a1'))).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.list('c1', 's1') })
  })

  it('replaces the list with the confirmed order, and reloads it after a stale order', async () => {
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useReorderScenes('c1', 's1'), { wrapper })

    api.reorderScenes.mockResolvedValueOnce([knott])
    await act(() => result.current.mutateAsync(['a1']))
    expect(client.getQueryData(sceneQueryKeys.list('c1', 's1'))).toEqual([knott])
    expect(invalidate).not.toHaveBeenCalled()

    api.reorderScenes.mockRejectedValueOnce(new StaleSceneOrderError())
    await act(() => result.current.mutateAsync(['a1']).catch(() => undefined))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.list('c1', 's1') })
  })
})
