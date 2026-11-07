import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useHeldItemsAnnouncement } from './useHeldItemsAnnouncement'

// specs/scene-play/ux.md section 22.7; SPL-UX-52, SPL-UX-54, SPL-A11Y-21.
const diary = { revealId: 'r1', name: "Walter Corbitt's diary" }
const letter = { revealId: 'r2', name: 'A letter from Knott' }

describe('useHeldItemsAnnouncement', () => {
  it('is silent on the first load and announces a later gain, naming the Item and the Investigator', () => {
    const { result, rerender } = renderHook(({ items }) => useHeldItemsAnnouncement(items, 'Harvey Walters', true), {
      initialProps: { items: [diary] as typeof diary[] | undefined },
    })
    expect(result.current.message).toBe('')

    rerender({ items: [letter, diary] })

    expect(result.current.message).toBe('Harvey Walters now holds A letter from Knott.')
  })

  it('announces a taken-back Item, stays silent on an unchanged refetch, and never moves focus', () => {
    const { result, rerender } = renderHook(({ items }) => useHeldItemsAnnouncement(items, 'Harvey Walters', true), {
      initialProps: { items: [diary] as typeof diary[] | undefined },
    })

    rerender({ items: [] })
    const takenBack = result.current

    expect(takenBack.message).toBe("Walter Corbitt's diary was taken back from Harvey Walters.")
    expect(takenBack.sequence).toBeGreaterThan(0)

    rerender({ items: [] })

    expect(result.current).toEqual(takenBack)
  })
})
