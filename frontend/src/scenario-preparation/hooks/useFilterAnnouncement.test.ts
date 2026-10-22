import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterAnnouncement } from './useFilterAnnouncement'

// SP-A11Y-23 and SP-A11Y-32: "{n} shown." is debounced by 500 ms and never announced on first load.
describe('useFilterAnnouncement', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('announces nothing on first load', () => {
    const { result } = renderHook(() => useFilterAnnouncement(12, 'a'))

    act(() => vi.advanceTimersByTime(2000))

    expect(result.current).toBe('')
  })

  it('announces the count 500 ms after the filter changed, and only the last change', () => {
    const { result, rerender } = renderHook(({ count, key }) => useFilterAnnouncement(count, key), { initialProps: { count: 12, key: 'a' } })

    rerender({ count: 5, key: 'ab' })
    act(() => vi.advanceTimersByTime(300))
    rerender({ count: 2, key: 'abc' })
    act(() => vi.advanceTimersByTime(499))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(1))

    expect(result.current).toBe('2 shown.')
  })
})
