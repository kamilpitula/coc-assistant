import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene } from '@/scene-play/types/ActiveScene'

import { usePlayerRevealAnnouncement } from './usePlayerRevealAnnouncement'

// specs/scene-play/ux.md section 14; SPL-UX-28.
const { mockUseAnnouncement } = vi.hoisted(() => ({ mockUseAnnouncement: vi.fn() }))
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealAnnouncement: mockUseAnnouncement }))

const reveals = [{ revealId: 'r1', revealedAt: '2026-10-28T19:52:00Z', subjectType: 'Handout' as const, title: 'T', handoutKind: 'Text' as const, content: null, file: null, imageDescription: null }]
const present: ActiveScene = {
  kind: 'present-player',
  reveals,
  title: 'The Corbitt House',
  location: '',
  investigatorsPresent: [{ name: 'Lucy Ward', isYours: false }, { name: 'Harvey Walters', isYours: true }],
}

describe('usePlayerRevealAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAnnouncement.mockReturnValue({ message: '', sequence: 0 })
  })

  it('watches the Reveals of a present Player under their own Investigator\'s name', () => {
    renderHook(() => usePlayerRevealAnnouncement(present, false, true))

    expect(mockUseAnnouncement).toHaveBeenCalledWith(reveals, 'Harvey Walters', true)
  })

  it.each([
    ['the Keeper', present, true],
    ['an absent Player', { kind: 'absent-player', title: 'X' } as ActiveScene, false],
    ['no Active Scene', null, false],
    ['a scene still loading', undefined, false],
  ])('watches nothing for %s', (_label, scene, isKeeper) => {
    renderHook(() => usePlayerRevealAnnouncement(scene, isKeeper, true))

    expect(mockUseAnnouncement).toHaveBeenCalledWith(undefined, null, true)
  })
})
