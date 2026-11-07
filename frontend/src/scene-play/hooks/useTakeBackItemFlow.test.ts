import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TakeBackItemRequest } from '@/scene-play/components/take-back-item-dialog/take-back-item-dialog'
import { TakeBackConflictError, TakeBackItemNotFoundError } from '@/scene-play/services/itemHolderApi'

import { takeBackRefusalFor, useTakeBackItemFlow } from './useTakeBackItemFlow'

// specs/scene-play/ux.md section 22.4; SPL-UX-54.
const { mockUseTakeBack, mutate, reset } = vi.hoisted(() => ({ mockUseTakeBack: vi.fn(), mutate: vi.fn(), reset: vi.fn() }))
vi.mock('@/scene-play/hooks/useHeldItems', () => ({ useTakeBackItem: mockUseTakeBack }))

const itemName = "Walter Corbitt's diary"
const request: TakeBackItemRequest = { itemId: 'k1', itemName, holderId: 'i1', holderName: 'Harvey Walters', triggerId: 'take-back-trigger-k1' }

describe('takeBackRefusalFor', () => {
  it('says nothing without an error', () => {
    expect(takeBackRefusalFor(null, itemName)).toBeNull()
  })

  it('names a missing Item and asks to retry for any other failure', () => {
    expect(takeBackRefusalFor(new TakeBackItemNotFoundError(), itemName)).toBe(`We couldn't find ${itemName}. It may have been deleted.`)
    expect(takeBackRefusalFor(new TakeBackConflictError(), itemName)).toBe(`We couldn't take ${itemName} back. Try again.`)
    expect(takeBackRefusalFor(new Error('boom'), itemName)).toBe(`We couldn't take ${itemName} back. Try again.`)
  })
})

describe('useTakeBackItemFlow', () => {
  const callbacks = { onTakenBack: vi.fn(), onRefetch: vi.fn() }
  const setup = (error: unknown = null, isPending = false) => {
    mockUseTakeBack.mockReturnValue({ mutate, reset, isPending, error })
    return renderHook(() => useTakeBackItemFlow('c1', callbacks))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = '<button id="take-back-trigger-k1">Take back</button><button id="give-trigger-k1">Give...</button>'
  })

  it('opens a request and cancels it without taking back', () => {
    const { result } = setup()

    act(() => result.current.open(request))
    expect(result.current.request).toEqual(request)
    act(() => result.current.cancel())

    expect(result.current.request).toBeNull()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('takes back, then closes and tells the page who it was taken from', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onSuccess: () => void }) => handlers.onSuccess())
    const { result } = setup()
    act(() => result.current.open(request))

    act(() => result.current.confirm())

    expect(mutate).toHaveBeenCalledWith('k1', expect.anything())
    expect(callbacks.onTakenBack).toHaveBeenCalledWith(`${itemName} taken back from Harvey Walters.`)
    expect(result.current.request).toBeNull()
  })

  it('does nothing when confirmed with no request', () => {
    const { result } = setup()

    act(() => result.current.confirm())

    expect(mutate).not.toHaveBeenCalled()
  })

  it('asks the page to refetch after a race and keeps the dialog open', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onError: (error: Error) => void }) => handlers.onError(new TakeBackConflictError()))
    const { result } = setup()
    act(() => result.current.open(request))

    act(() => result.current.confirm())

    expect(callbacks.onRefetch).toHaveBeenCalledTimes(1)
    expect(result.current.request).toEqual(request)
  })

  it('does not refetch when the Item is gone', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onError: (error: Error) => void }) => handlers.onError(new TakeBackItemNotFoundError()))
    const { result } = setup()
    act(() => result.current.open(request))

    act(() => result.current.confirm())

    expect(callbacks.onRefetch).not.toHaveBeenCalled()
  })

  it('shows the refusal for the open request, and none once closed', () => {
    const { result } = setup(new TakeBackConflictError())
    expect(result.current.refusal).toBeNull()

    act(() => result.current.open(request))

    expect(result.current.refusal).toBe(`We couldn't take ${itemName} back. Try again.`)
  })

  it('returns focus to the trigger, falling back to "Give..."', () => {
    const { result } = setup()
    act(() => result.current.open(request, { fallbackIds: ['give-trigger-k1'] }))

    act(() => result.current.returnFocus(new Event('focus')))
    expect(document.activeElement?.id).toBe('take-back-trigger-k1')

    document.getElementById('take-back-trigger-k1')?.remove()
    act(() => result.current.returnFocus(new Event('focus')))
    expect(document.activeElement?.id).toBe('give-trigger-k1')
  })

  it('reports the in-flight state', () => {
    const { result } = setup(null, true)

    expect(result.current.pending).toBe(true)
  })
})
