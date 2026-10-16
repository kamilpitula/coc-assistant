import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { scenarioQueryKeys, StaleScenarioOrderError } from '@/scenario-preparation/services/scenarioApi'
import type { Scenario } from '@/scenario-preparation/types/Scenario'

import { useCreateScenario, useEditScenario, useReorderScenarios, useScenario, useScenarios } from './useScenarios'

// Design record D6/D9/D10: Keeper-gated queries, confirmed (not optimistic) updates, a refetch after a stale order.

const api = vi.hoisted(() => ({
  getScenarios: vi.fn(),
  getScenario: vi.fn(),
  createScenario: vi.fn(),
  editScenario: vi.fn(),
  reorderScenarios: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scenario-preparation/services/scenarioApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scenario-preparation/services/scenarioApi')>()),
  ...api,
}))

const haunting: Scenario = { id: 's1', title: 'The Haunting', keeperNotes: '' }
const edge: Scenario = { id: 's2', title: 'Edge of Darkness', keeperNotes: 'Notes' }

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

describe('Scenario hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the Campaign list when enabled', async () => {
    api.getScenarios.mockResolvedValue([haunting])
    const { wrapper } = setup()

    const { result } = renderHook(() => useScenarios('c1', true), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([haunting]))
    expect(api.getScenarios).toHaveBeenCalledWith('token', 'c1')
  })

  it('sends no request for a Player (disabled), for the list or a single Scenario', () => {
    const { wrapper } = setup()

    renderHook(() => useScenarios('c1', false), { wrapper })
    renderHook(() => useScenario('c1', 's1', false), { wrapper })

    expect(api.getScenarios).not.toHaveBeenCalled()
    expect(api.getScenario).not.toHaveBeenCalled()
  })

  it('loads one Scenario when enabled', async () => {
    api.getScenario.mockResolvedValue(haunting)
    const { wrapper } = setup()

    const { result } = renderHook(() => useScenario('c1', 's1', true), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(haunting))
  })

  it('invalidates the list after a create so the new Scenario and the attention item update', async () => {
    api.createScenario.mockResolvedValue(haunting)
    const { client, wrapper } = setup()
    client.setQueryData(scenarioQueryKeys.list('c1'), [])
    const { result } = renderHook(() => useCreateScenario('c1'), { wrapper })

    await act(() => result.current.mutateAsync({ title: 'The Haunting', keeperNotes: '' }))

    expect(client.getQueryState(scenarioQueryKeys.list('c1'))?.isInvalidated).toBe(true)
    expect(client.getQueryData(scenarioQueryKeys.detail('c1', 's1'))).toEqual(haunting)
  })

  it('stores the saved Scenario and invalidates the list after an edit', async () => {
    api.editScenario.mockResolvedValue({ ...edge, title: 'Edge' })
    const { client, wrapper } = setup()
    client.setQueryData(scenarioQueryKeys.list('c1'), [haunting, edge])
    const { result } = renderHook(() => useEditScenario('c1', 's2'), { wrapper })

    await act(() => result.current.mutateAsync({ title: 'Edge', keeperNotes: 'Notes' }))

    expect(client.getQueryData(scenarioQueryKeys.detail('c1', 's2'))).toEqual({ ...edge, title: 'Edge' })
    expect(client.getQueryState(scenarioQueryKeys.list('c1'))?.isInvalidated).toBe(true)
  })

  it('replaces the list with the confirmed order and shows nothing before the server answers', async () => {
    let resolve: (scenarios: Scenario[]) => void = () => {}
    api.reorderScenarios.mockReturnValue(new Promise<Scenario[]>((done) => (resolve = done)))
    const { client, wrapper } = setup()
    client.setQueryData(scenarioQueryKeys.list('c1'), [haunting, edge])
    const { result } = renderHook(() => useReorderScenarios('c1'), { wrapper })

    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.mutateAsync(['s2', 's1'])
    })
    expect(client.getQueryData(scenarioQueryKeys.list('c1'))).toEqual([haunting, edge])

    await act(async () => {
      resolve([edge, haunting])
      await pending
    })

    expect(client.getQueryData(scenarioQueryKeys.list('c1'))).toEqual([edge, haunting])
    expect(api.reorderScenarios).toHaveBeenCalledWith('token', 'c1', ['s2', 's1'])
  })

  it('refetches the shown list after a stale order, and not after any other failure', async () => {
    const { client, wrapper } = setup()
    api.getScenarios.mockResolvedValue([haunting, edge])
    renderHook(() => useScenarios('c1', true), { wrapper })
    await waitFor(() => expect(api.getScenarios).toHaveBeenCalledTimes(1))
    const { result } = renderHook(() => useReorderScenarios('c1'), { wrapper })

    api.reorderScenarios.mockRejectedValueOnce(new Error('boom'))
    await act(() => result.current.mutateAsync(['s2', 's1']).catch(() => undefined))
    expect(api.getScenarios).toHaveBeenCalledTimes(1)
    expect(client.getQueryState(scenarioQueryKeys.list('c1'))?.isInvalidated).toBe(false)

    api.reorderScenarios.mockRejectedValueOnce(new StaleScenarioOrderError())
    await act(() => result.current.mutateAsync(['s2', 's1']).catch(() => undefined))
    await waitFor(() => expect(api.getScenarios).toHaveBeenCalledTimes(2))
  })
})
