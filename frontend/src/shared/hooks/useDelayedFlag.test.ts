import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDelayedFlag } from './useDelayedFlag'

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stays false until the flag has been true for the delay', () => {
    const { result } = renderHook(() => useDelayedFlag(true, 400))

    act(() => vi.advanceTimersByTime(399))
    expect(result.current).toBe(false)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })

  it('is false while the flag is false', () => {
    const { result } = renderHook(() => useDelayedFlag(false, 400))

    act(() => vi.advanceTimersByTime(1000))

    expect(result.current).toBe(false)
  })

  it('turns false as soon as the flag turns false and restarts the delay when it is true again', () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag, 400), { initialProps: { flag: true } })
    act(() => vi.advanceTimersByTime(400))

    rerender({ flag: false })
    expect(result.current).toBe(false)

    rerender({ flag: true })
    act(() => vi.advanceTimersByTime(399))
    expect(result.current).toBe(false)
  })

  it('never turns true if the flag turns false before the delay', () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag, 400), { initialProps: { flag: true } })
    act(() => vi.advanceTimersByTime(200))

    rerender({ flag: false })
    act(() => vi.advanceTimersByTime(1000))

    expect(result.current).toBe(false)
  })
})
