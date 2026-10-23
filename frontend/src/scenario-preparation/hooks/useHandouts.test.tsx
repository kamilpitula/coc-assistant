import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handoutQueryKeys, StaleHandoutOrderError } from '@/scenario-preparation/services/handoutApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import type { RichTextDocument } from '@/shared/types/RichText'

import { useCreateHandout, useDeleteHandout, useEditHandout, useHandout, useHandoutFile, useReorderHandouts } from './useHandouts'

// Design record, frontend data: create and delete invalidate the Scene; edit sets the Handout and invalidates the Scene;
// reorder sets the Scene's handouts from the response, like useScenes.

const api = vi.hoisted(() => ({
  getHandout: vi.fn(),
  getHandoutFile: vi.fn(),
  createHandout: vi.fn(),
  editHandout: vi.fn(),
  deleteHandout: vi.fn(),
  reorderHandouts: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/handoutApi', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }))

const content: RichTextDocument = { root: { type: 'root', children: [] } }
const handout = { id: 'h1', kind: 'ReadAloud' as const, visibility: 'PlayerFacing' as const, title: 'The front door', content }
const input = { kind: handout.kind, visibility: handout.visibility, title: handout.title, content }
const scene: Scene = {
  id: 'a1',
  title: 'The Corbitt House',
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  location: '',
  keeperNotes: null,
  nonPlayerEntityLinks: [],
  handouts: [{ id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }],
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('Handout hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads one Handout with the token and ids, only when enabled', async () => {
    api.getHandout.mockResolvedValue(handout)
    const { wrapper } = setup()

    const disabled = renderHook(() => useHandout('c1', 's1', 'a1', 'h1', false), { wrapper })
    const enabled = renderHook(() => useHandout('c1', 's1', 'a1', 'h1', true), { wrapper })

    await waitFor(() => expect(enabled.result.current.data).toEqual(handout))
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(api.getHandout).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'h1')
  })

  it('creates a Handout with the token and ids, then invalidates the Scene', async () => {
    api.createHandout.mockResolvedValue(handout)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useCreateHandout('c1', 's1', 'a1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(api.createHandout).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
  })

  it('saves a Handout, sets the cached Handout, then invalidates the Scene', async () => {
    api.editHandout.mockResolvedValue({ ...handout, title: 'Renamed' })
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useEditHandout('c1', 's1', 'a1', 'h1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(api.editHandout).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'h1', input)
    expect(client.getQueryData(handoutQueryKeys.detail('c1', 's1', 'a1', 'h1'))).toEqual({ ...handout, title: 'Renamed' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
  })

  it('invalidates the stored file of the Handout when a save succeeds, so a replaced image is fetched again (SP-UX-85)', async () => {
    api.editHandout.mockResolvedValue(handout)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useEditHandout('c1', 's1', 'a1', 'h1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: handoutQueryKeys.file('c1', 's1', 'a1', 'h1') })
  })

  it('loads the stored file of a Handout as a Blob with the token and ids, only when enabled', async () => {
    const blob = new Blob(['png'], { type: 'image/png' })
    api.getHandoutFile.mockResolvedValue(blob)
    const { wrapper } = setup()

    const disabled = renderHook(() => useHandoutFile('c1', 's1', 'a1', 'h1', false), { wrapper })
    const enabled = renderHook(() => useHandoutFile('c1', 's1', 'a1', 'h1', true), { wrapper })

    await waitFor(() => expect(enabled.result.current.data).toBe(blob))
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(api.getHandoutFile).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'h1')
  })

  it('deletes a Handout, removes its cache entry, then invalidates the Scene', async () => {
    api.deleteHandout.mockResolvedValue(undefined)
    const { client, wrapper } = setup()
    client.setQueryData(handoutQueryKeys.detail('c1', 's1', 'a1', 'h1'), handout)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteHandout('c1', 's1', 'a1', 'h1'), { wrapper })
    await act(() => result.current.mutateAsync())

    expect(api.deleteHandout).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'h1')
    expect(client.getQueryData(handoutQueryKeys.detail('c1', 's1', 'a1', 'h1'))).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
  })

  it("sets the cached Scene's handouts from the confirmed order, keeping the rest of the Scene", async () => {
    const reordered = [{ id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: 'Second' }]
    api.reorderHandouts.mockResolvedValue(reordered)
    const { client, wrapper } = setup()
    client.setQueryData(sceneQueryKeys.detail('c1', 's1', 'a1'), scene)

    const { result } = renderHook(() => useReorderHandouts('c1', 's1', 'a1'), { wrapper })
    await act(() => result.current.mutateAsync(['h2']))

    expect(api.reorderHandouts).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', ['h2'])
    expect(client.getQueryData(sceneQueryKeys.detail('c1', 's1', 'a1'))).toEqual({ ...scene, handouts: reordered })
  })

  it('reloads the Scene when the order is stale, and leaves the cache alone on other failures', async () => {
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useReorderHandouts('c1', 's1', 'a1'), { wrapper })

    api.reorderHandouts.mockRejectedValueOnce(new Error('boom'))
    await act(() => result.current.mutateAsync(['h1']).catch(() => undefined))
    expect(invalidate).not.toHaveBeenCalled()

    api.reorderHandouts.mockRejectedValueOnce(new StaleHandoutOrderError())
    await act(() => result.current.mutateAsync(['h1']).catch(() => undefined))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
  })
})
