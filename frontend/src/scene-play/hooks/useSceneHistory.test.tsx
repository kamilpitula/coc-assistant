import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sceneHistoryQueryKeys } from '@/scene-play/services/sceneHistoryApi'
import type { SceneHistory } from '@/scene-play/types/SceneHistory'

import { useSceneHistory } from './useSceneHistory'

// specs/scene-play/ux.md section 23.2 and 23.3: the Scene History page reads one query, refetched on its live topics.
const api = vi.hoisted(() => ({ getSceneHistory: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scene-play/services/sceneHistoryApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/scene-play/services/sceneHistoryApi')>()),
  ...api,
}))

const history: SceneHistory = {
  kind: 'player',
  investigatorName: 'Harvey Walters',
  scenes: [
    {
      sceneId: 's2',
      scenarioTitle: 'The Haunting',
      title: 'The Corbitt House',
      startedAt: '2026-11-07T19:05:00Z',
      finishedAt: null,
      reveals: [],
    },
  ],
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { wrapper }
}

describe('useSceneHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the Scene History of the Campaign with the token', async () => {
    api.getSceneHistory.mockResolvedValue(history)
    const { wrapper } = setup()

    const { result } = renderHook(() => useSceneHistory('c1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(history))
    expect(api.getSceneHistory).toHaveBeenCalledWith('token', 'c1')
  })

  it('sends no request when disabled', () => {
    const { wrapper } = setup()

    renderHook(() => useSceneHistory('c1', false), { wrapper })

    expect(api.getSceneHistory).not.toHaveBeenCalled()
  })

  it('uses the history query key, so the live topics refetch it', () => {
    expect(sceneHistoryQueryKeys.detail('c1')).toEqual(['campaigns', 'c1', 'scene-history'])
  })
})
