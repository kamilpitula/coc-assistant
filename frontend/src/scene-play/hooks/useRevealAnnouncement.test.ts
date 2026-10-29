import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PlayerReveal } from '@/scene-play/types/Reveal'

import { useRevealAnnouncement } from './useReveals'

// specs/scene-play/ux.md section 14; SPL-UX-28, SPL-A11Y-12: arrivals are announced after the first load, never on it.
vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => vi.fn() }))

const reveal = (revealId: string, title: string): PlayerReveal => ({
  revealId,
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title,
  handoutKind: 'Text',
  content: null,
  file: null,
  imageDescription: null,
})

describe('useRevealAnnouncement', () => {
  const render = (initial: PlayerReveal[] | undefined, fetched = true) =>
    renderHook(({ reveals, isFetched }) => useRevealAnnouncement(reveals, 'Harvey Walters', isFetched), { initialProps: { reveals: initial, isFetched: fetched } })

  it('announces nothing on the first load, even with Reveals already there', () => {
    const { result } = render([reveal('r1', 'The front door')])

    expect(result.current).toEqual({ message: '', sequence: 0 })
  })

  it('announces one new Reveal by its title and several by count', () => {
    const { result, rerender } = render([reveal('r1', 'The front door')])

    rerender({ reveals: [reveal('r2', 'The cellar door'), reveal('r1', 'The front door')], isFetched: true })
    expect(result.current).toEqual({ message: 'New for Harvey Walters: The cellar door.', sequence: 1 })

    rerender({ reveals: [reveal('r4', 'D'), reveal('r3', 'C'), reveal('r2', 'The cellar door'), reveal('r1', 'The front door')], isFetched: true })
    expect(result.current).toEqual({ message: '2 new for Harvey Walters.', sequence: 2 })
  })

  it('announces nothing for a refetch that finds no change, and waits for the first fetch after mount', () => {
    const { result, rerender } = render(undefined, false)
    rerender({ reveals: [reveal('r1', 'The front door')], isFetched: false })
    rerender({ reveals: [reveal('r1', 'The front door')], isFetched: true })
    rerender({ reveals: [reveal('r1', 'The front door')], isFetched: true })

    expect(result.current.sequence).toBe(0)
  })
})
