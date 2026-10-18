import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { HumanNpc, HumanNpcInput } from '@/scenario-preparation/types/HumanNpc'
import type { MythosCreature, MythosCreatureInput } from '@/scenario-preparation/types/MythosCreature'

import {
  useCreateHumanNpc,
  useCreateMythosCreature,
  useDeleteHumanNpc,
  useDeleteMythosCreature,
  useEditHumanNpc,
  useEditMythosCreature,
  useHumanNpc,
  useMythosCreature,
  useNonPlayerEntities,
} from './useNonPlayerEntities'

const humanApi = vi.hoisted(() => ({ getHumanNpc: vi.fn(), createHumanNpc: vi.fn(), editHumanNpc: vi.fn(), deleteHumanNpc: vi.fn() }))
const mythosApi = vi.hoisted(() => ({ getMythosCreature: vi.fn(), createMythosCreature: vi.fn(), editMythosCreature: vi.fn(), deleteMythosCreature: vi.fn() }))
const listApi = vi.hoisted(() => ({ getNonPlayerEntities: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/humanNpcApi', () => humanApi)
vi.mock('@/scenario-preparation/services/mythosCreatureApi', () => mythosApi)
vi.mock('@/scenario-preparation/services/nonPlayerEntityApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scenario-preparation/services/nonPlayerEntityApi')>()),
  ...listApi,
}))

const human = { id: 'h1', name: 'Mr. Knott', age: 62 } as HumanNpc
const creature = { id: 'm1', name: 'Ghoul' } as MythosCreature

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('Non-Player Entity hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the list and one Human NPC only when enabled', async () => {
    listApi.getNonPlayerEntities.mockResolvedValue([{ id: 'h1', type: 'HumanNpc', name: 'Mr. Knott' }])
    humanApi.getHumanNpc.mockResolvedValue(human)
    const { wrapper } = setup()

    const list = renderHook(() => useNonPlayerEntities('c1', true), { wrapper })
    const one = renderHook(() => useHumanNpc('c1', 'h1', true), { wrapper })
    const disabled = renderHook(() => useHumanNpc('c1', 'h2', false), { wrapper })

    await waitFor(() => expect(list.result.current.data).toHaveLength(1))
    await waitFor(() => expect(one.result.current.data).toEqual(human))
    expect(humanApi.getHumanNpc).toHaveBeenCalledTimes(1)
    expect(disabled.result.current.fetchStatus).toBe('idle')
  })

  it('caches a created Human NPC and reloads the list', async () => {
    humanApi.createHumanNpc.mockResolvedValue(human)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateHumanNpc('c1'), { wrapper })

    await act(() => result.current.mutateAsync({ name: 'Mr. Knott', age: 62 }))

    expect(humanApi.createHumanNpc).toHaveBeenCalledWith('token', 'c1', 'Mr. Knott', 62)
    expect(client.getQueryData(nonPlayerEntityQueryKeys.humanNpc('c1', 'h1'))).toEqual(human)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: nonPlayerEntityQueryKeys.list('c1') })
  })

  it('replaces the cached Human NPC with the saved one and reloads the list', async () => {
    humanApi.editHumanNpc.mockResolvedValue(human)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useEditHumanNpc('c1', 'h1'), { wrapper })

    await act(() => result.current.mutateAsync({ name: 'Mr. Knott' } as HumanNpcInput))

    expect(client.getQueryData(nonPlayerEntityQueryKeys.humanNpc('c1', 'h1'))).toEqual(human)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: nonPlayerEntityQueryKeys.list('c1') })
  })

  it('drops the cache entry of a deleted Human NPC and reloads the list', async () => {
    humanApi.deleteHumanNpc.mockResolvedValue(undefined)
    const { client, wrapper } = setup()
    client.setQueryData(nonPlayerEntityQueryKeys.humanNpc('c1', 'h1'), human)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteHumanNpc('c1', 'h1'), { wrapper })

    await act(() => result.current.mutateAsync())

    expect(client.getQueryData(nonPlayerEntityQueryKeys.humanNpc('c1', 'h1'))).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: nonPlayerEntityQueryKeys.list('c1') })
  })

  it('loads one Mythos Creature only when enabled', async () => {
    mythosApi.getMythosCreature.mockResolvedValue(creature)
    const { wrapper } = setup()

    const one = renderHook(() => useMythosCreature('c1', 'm1', true), { wrapper })
    const disabled = renderHook(() => useMythosCreature('c1', 'm2', false), { wrapper })

    await waitFor(() => expect(one.result.current.data).toEqual(creature))
    expect(mythosApi.getMythosCreature).toHaveBeenCalledWith('token', 'c1', 'm1')
    expect(mythosApi.getMythosCreature).toHaveBeenCalledTimes(1)
    expect(disabled.result.current.fetchStatus).toBe('idle')
  })

  it('caches a created Mythos Creature and reloads the list', async () => {
    mythosApi.createMythosCreature.mockResolvedValue(creature)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateMythosCreature('c1'), { wrapper })

    await act(() => result.current.mutateAsync({ name: 'Ghoul' }))

    expect(mythosApi.createMythosCreature).toHaveBeenCalledWith('token', 'c1', 'Ghoul')
    expect(client.getQueryData(nonPlayerEntityQueryKeys.mythosCreature('c1', 'm1'))).toEqual(creature)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: nonPlayerEntityQueryKeys.list('c1') })
  })

  it('replaces the cached Mythos Creature with the saved one and reloads the list', async () => {
    mythosApi.editMythosCreature.mockResolvedValue(creature)
    const { client, wrapper } = setup()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useEditMythosCreature('c1', 'm1'), { wrapper })

    await act(() => result.current.mutateAsync({ name: 'Ghoul' } as MythosCreatureInput))

    expect(client.getQueryData(nonPlayerEntityQueryKeys.mythosCreature('c1', 'm1'))).toEqual(creature)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: nonPlayerEntityQueryKeys.list('c1') })
  })

  it('drops the cache entry of a deleted Mythos Creature and reloads the list', async () => {
    mythosApi.deleteMythosCreature.mockResolvedValue(undefined)
    const { client, wrapper } = setup()
    client.setQueryData(nonPlayerEntityQueryKeys.mythosCreature('c1', 'm1'), creature)
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteMythosCreature('c1', 'm1'), { wrapper })

    await act(() => result.current.mutateAsync())

    expect(client.getQueryData(nonPlayerEntityQueryKeys.mythosCreature('c1', 'm1'))).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: nonPlayerEntityQueryKeys.list('c1') })
  })
})
