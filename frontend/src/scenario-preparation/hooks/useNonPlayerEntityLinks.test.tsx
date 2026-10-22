import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'

import { useEditNonPlayerEntityLink, useLinkNonPlayerEntity, useUnlinkNonPlayerEntity } from './useNonPlayerEntityLinks'

// Design record D4 and the frontend data step: each confirmed write reloads the Scene that carries the links.

const api = vi.hoisted(() => ({
  linkNonPlayerEntity: vi.fn(),
  editNonPlayerEntityLink: vi.fn(),
  unlinkNonPlayerEntity: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/nonPlayerEntityLinkApi', () => api)

const link = {
  id: 'l1',
  nonPlayerEntity: { id: 'm1', type: 'MythosCreature' as const, name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: null,
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('Non-Player Entity link hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links with the token and the ids, then invalidates the Scene', async () => {
    api.linkNonPlayerEntity.mockResolvedValue(link)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const input = { nonPlayerEntity: { type: 'MythosCreature' as const, id: 'm1' }, playerFacingName: 'A shape in the cellar', playerFacingDescription: null }

    const { result } = renderHook(() => useLinkNonPlayerEntity('c1', 's1', 'a1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(api.linkNonPlayerEntity).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
  })

  it('saves a link, then invalidates the Scene', async () => {
    api.editNonPlayerEntityLink.mockResolvedValue(link)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const input = { playerFacingName: 'Renamed', playerFacingDescription: null }

    const { result } = renderHook(() => useEditNonPlayerEntityLink('c1', 's1', 'a1', 'l1'), { wrapper })
    await act(() => result.current.mutateAsync(input))

    expect(api.editNonPlayerEntityLink).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'l1', input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
  })

  it('unlinks, then invalidates the Scene', async () => {
    api.unlinkNonPlayerEntity.mockResolvedValue(undefined)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useUnlinkNonPlayerEntity('c1', 's1', 'a1', 'l1'), { wrapper })
    await act(() => result.current.mutateAsync())

    expect(api.unlinkNonPlayerEntity).toHaveBeenCalledWith('token', 'c1', 's1', 'a1', 'l1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: sceneQueryKeys.detail('c1', 's1', 'a1') })
  })

  it('does not invalidate the Scene when the write fails', async () => {
    api.linkNonPlayerEntity.mockRejectedValue(new Error('boom'))
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useLinkNonPlayerEntity('c1', 's1', 'a1'), { wrapper })
    await act(() => result.current.mutateAsync({ nonPlayerEntity: { type: 'HumanNpc', id: 'h1' }, playerFacingName: 'x', playerFacingDescription: null }).catch(() => undefined))

    expect(invalidate).not.toHaveBeenCalled()
  })
})
