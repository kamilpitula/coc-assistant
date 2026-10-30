import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'

import { useRevealToInvestigators } from './useReveals'

// PBI-SPL-002 D5: a Reveal answers with the created Reveal; the Active Scene and the Keeper Clues are refetched, not patched.
const { mockReveal } = vi.hoisted(() => ({ mockReveal: vi.fn() }))
vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/scene-play/services/revealApi', async (importOriginal) => ({ ...(await importOriginal<object>()), revealToInvestigators: mockReveal }))

describe('useRevealToInvestigators', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates the Active Scene and the Keeper Clues after a Reveal, and caches nothing from the answer', async () => {
    mockReveal.mockResolvedValue({ revealId: 'r1' })
    const client = new QueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const setData = vi.spyOn(client, 'setQueryData')
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useRevealToInvestigators('c1'), { wrapper })

    await act(async () => result.current.mutateAsync({ subjectType: 'Handout', subjectId: 'h1', investigatorIds: ['i1'] }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activeSceneQueryKeys.detail('c1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cluesQueryKeys.investigators('c1') })
    expect(setData).not.toHaveBeenCalled()
    expect(mockReveal).toHaveBeenCalledWith('token', 'c1', { subjectType: 'Handout', subjectId: 'h1', investigatorIds: ['i1'] })
  })
})
