import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { rememberOwnWallEntry } from '@/campaign-play/services/ownWallEntries'
import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { useWallEntryAnnouncement } from './useWallEntryAnnouncement'

// specs/campaign-wall/ux.md section 4.5 (WL-UX-14): announcements derived from the entries before and after a refetch.

function entry(id: string, minute: number, author = 'Eleanor Hart'): WallEntry {
  const createdAt = new Date(Date.UTC(2026, 9, 16, 19, minute)).toISOString()
  return { id, text: id, visibility: 'Public', createdAt, authorDisplayName: author }
}

const first = entry('first', 0)
const second = entry('second', 1)
const third = entry('third', 2, 'Ana Ruiz')
const fourth = entry('fourth', 3)

function setup(initialEntries: WallEntry[] | undefined, initialFetched: boolean) {
  return renderHook((props: { entries: WallEntry[] | undefined; fetched: boolean }) => useWallEntryAnnouncement(props.entries, props.fetched), {
    initialProps: { entries: initialEntries, fetched: initialFetched },
  })
}

describe('useWallEntryAnnouncement', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('announces nothing for entries shown before the list has been fetched since opening, nor for the fetch itself', () => {
    const { result, rerender } = setup([first], false)

    rerender({ entries: [first, entry('cached-older', -5)], fetched: false })
    rerender({ entries: [second, first], fetched: true })

    expect(result.current.message).toBe('')
  })

  it('announces the first new entry at once', () => {
    const { result, rerender } = setup([first], true)

    rerender({ entries: [second, first], fetched: true })

    expect(result.current.message).toBe('New Wall Entry from Eleanor Hart.')
  })

  it('merges entries arriving within 5 seconds into one message at the end of the window, then announces at once again', () => {
    const { result, rerender } = setup([first], true)
    rerender({ entries: [second, first], fetched: true })

    rerender({ entries: [third, second, first], fetched: true })
    act(() => vi.advanceTimersByTime(2000))
    rerender({ entries: [fourth, third, second, first], fetched: true })
    expect(result.current.message).toBe('New Wall Entry from Eleanor Hart.')

    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.message).toBe('2 new Wall Entries.')

    act(() => vi.advanceTimersByTime(5000))
    const later = entry('later', 9)
    rerender({ entries: [later, fourth, third, second, first], fetched: true })
    expect(result.current.message).toBe('New Wall Entry from Eleanor Hart.')
  })

  it('does not announce removals, older pages, or the viewer own post from this tab', () => {
    const { result, rerender } = setup([second, first], true)

    rerender({ entries: [first], fetched: true })
    rerender({ entries: [first, entry('older', -10)], fetched: true })
    rememberOwnWallEntry(third.id)
    rerender({ entries: [third, first, entry('older', -10)], fetched: true })

    expect(result.current.message).toBe('')
  })
})
