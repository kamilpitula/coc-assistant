import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useOriginBackLink } from './useOriginBackLink'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'

// specs/navigation/ux.md section 4 and PBI-NAV-002 design record D6: the origin label is the Active Scene title,
// or "the Active Scene" until the title is known or when no Scene is Active.
vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))

const keeperScene: ActiveScene = {
  kind: 'keeper',
  sceneId: 'scene-1',
  scenarioId: 'scenario-1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [],
}

function setup(scene: ActiveScene | null | undefined) {
  const queryClient = new QueryClient()
  if (scene !== undefined) {
    queryClient.setQueryData(activeSceneQueryKeys.detail('c1'), scene)
  }
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return renderHook(() => useOriginBackLink('c1'), { wrapper })
}

describe('useOriginBackLink', () => {
  it('returns the Active Scene title when known', async () => {
    const { result } = setup(keeperScene)

    await waitFor(() => expect(result.current).toBe('The Corbitt House'))
  })

  it('returns "the Active Scene" when no Scene is Active', async () => {
    const { result } = setup(null)

    await waitFor(() => expect(result.current).toBe('the Active Scene'))
  })

  it('returns "the Active Scene" until the title is known', () => {
    const { result } = setup(undefined)

    expect(result.current).toBe('the Active Scene')
  })
})
