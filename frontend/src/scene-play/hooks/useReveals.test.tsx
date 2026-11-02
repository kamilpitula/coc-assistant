import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

import { useRevealToInvestigators } from './useReveals'

// PBI-SPL-002 D5 and specs/scene-play/ux.md sections 13 and 21 (SPL-UX-21): the Active Scene is refetched after a Reveal, and the cached
// Reveals are current before the dialog can be reopened, so "(already revealed)" never shows stale data.
const { mockReveal } = vi.hoisted(() => ({ mockReveal: vi.fn() }))
vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scene-play/services/revealApi', async (importOriginal) => ({ ...(await importOriginal<object>()), revealToInvestigators: mockReveal }))

const reveal = (revealId: string): KeeperReveal => ({
  revealId,
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [{ id: 'i1', name: 'Harvey Walters' }],
})

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
  reveals: [reveal('old')],
}

describe('useRevealToInvestigators', () => {
  beforeEach(() => vi.clearAllMocks())

  const setup = (cached: KeeperActiveScene | undefined) => {
    const client = new QueryClient()
    if (cached) {
      client.setQueryData(activeSceneQueryKeys.detail('c1'), cached)
    }
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    return { client, invalidate, ...renderHook(() => useRevealToInvestigators('c1'), { wrapper }) }
  }
  const input = { subjectType: 'Handout' as const, subjectId: 'h1', investigatorIds: ['i1'] }

  it('puts the created Reveal first in the cached Active Scene before the mutation settles, so a reopened dialog is current', async () => {
    mockReveal.mockResolvedValue(reveal('new'))
    const { client, result } = setup(scene)

    await act(async () => result.current.mutateAsync(input))

    const cached = client.getQueryData<KeeperActiveScene>(activeSceneQueryKeys.detail('c1'))
    expect(cached?.reveals.map((entry) => entry.revealId)).toEqual(['new', 'old'])
  })

  it('still refetches the Active Scene and the Keeper Clues, so a Scene finished meanwhile shows as such', async () => {
    mockReveal.mockResolvedValue(reveal('new'))
    const { invalidate, result } = setup(scene)

    await act(async () => result.current.mutateAsync(input))

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activeSceneQueryKeys.detail('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cluesQueryKeys.investigators('c1') })
  })

  it('does not invent a cached Scene when none is cached, and does not duplicate a Reveal already there', async () => {
    mockReveal.mockResolvedValue(reveal('old'))
    const empty = setup(undefined)
    await act(async () => empty.result.current.mutateAsync(input))
    expect(empty.client.getQueryData(activeSceneQueryKeys.detail('c1'))).toBeUndefined()

    const filled = setup(scene)
    await act(async () => filled.result.current.mutateAsync(input))
    expect(filled.client.getQueryData<KeeperActiveScene>(activeSceneQueryKeys.detail('c1'))?.reveals).toHaveLength(1)
  })

  it('sends the subject and Investigators with the token', async () => {
    mockReveal.mockResolvedValue(reveal('new'))
    const { result } = setup(scene)

    await act(async () => result.current.mutateAsync(input))

    expect(mockReveal).toHaveBeenCalledWith('token', 'c1', input)
  })
})
