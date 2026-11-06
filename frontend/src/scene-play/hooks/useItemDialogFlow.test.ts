import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useItemDialogFlow } from './useItemDialogFlow'

interface Request {
  itemId: string
  triggerId: string
}

const request: Request = { itemId: 'k1', triggerId: 'give-k1' }

describe('item dialog flow core', () => {
  it('opens a request and cancels it with a reset', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useItemDialogFlow<Request>(reset))

    act(() => result.current.open(request))
    expect(result.current.request).toEqual(request)
    expect(reset).toHaveBeenCalledTimes(1)

    act(() => result.current.cancel())
    expect(result.current.request).toBeNull()
    expect(reset).toHaveBeenCalledTimes(2)
  })

  it('dismisses without a reset and returns focus through the trigger then the fallbacks', () => {
    const reset = vi.fn()
    const { result } = renderHook(() => useItemDialogFlow<Request>(reset))
    const trigger = document.createElement('button')
    trigger.id = 'give-k1'
    document.body.append(trigger)
    const fallback = document.createElement('h2')
    fallback.id = 'sub-tab'
    fallback.tabIndex = -1
    document.body.append(fallback)

    act(() => result.current.open(request, { fallbackIds: ['sub-tab'] }))
    act(() => result.current.dismiss())
    expect(result.current.request).toBeNull()
    expect(reset).toHaveBeenCalledTimes(1)

    act(() => result.current.open(request, { fallbackIds: ['sub-tab'] }))
    act(() => result.current.returnFocus(new Event('focus')))
    expect(document.activeElement).toBe(trigger)

    trigger.remove()
    act(() => result.current.returnFocus(new Event('focus')))
    expect(document.activeElement).toBe(fallback)

    trigger.remove()
    fallback.remove()
  })
})
