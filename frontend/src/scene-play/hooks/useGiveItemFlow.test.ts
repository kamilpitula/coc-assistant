import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GiveItemRequest } from '@/scene-play/components/give-item-dialog/give-item-dialog'
import { GiveItemConflictError, GiveItemNotFoundError, GiveItemRefusedError } from '@/scene-play/services/itemHolderApi'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

import { giveRefusalFor, useGiveItemFlow } from './useGiveItemFlow'

// specs/scene-play/ux.md sections 22.3 and 21.7; SPL-UX-52.
const { mockUseGive, mutate, reset } = vi.hoisted(() => ({ mockUseGive: vi.fn(), mutate: vi.fn(), reset: vi.fn() }))
vi.mock('@/scene-play/hooks/useHeldItems', () => ({ useGiveItem: mockUseGive }))

const itemName = "Walter Corbitt's diary"
const present = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]
const request: GiveItemRequest = { itemId: 'k1', itemName, holder: null, triggerId: 'give-trigger-k1' }

const itemReveal = (recipientIds: string[]): KeeperReveal => ({
  revealId: `r-k1-${recipientIds.join('-')}`,
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Item',
  title: itemName,
  handoutKind: null,
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'k1',
  recipients: present.filter((investigator) => recipientIds.includes(investigator.id)),
})

describe('giveRefusalFor', () => {
  it('says nothing without an error', () => {
    expect(giveRefusalFor(null, itemName)).toBeNull()
  })

  it('maps each refusal to its message and any other failure to the retry sentence', () => {
    expect(giveRefusalFor(new GiveItemConflictError(), itemName)).toBe(
      `${itemName} wasn't given: the Scene or the Item changed meanwhile.`,
    )
    expect(giveRefusalFor(new GiveItemRefusedError('itemId'), itemName)).toBe(`${itemName} is no longer part of this Scene.`)
    expect(giveRefusalFor(new GiveItemRefusedError('investigatorId'), itemName)).toBe(
      `That Investigator is no longer present or already holds ${itemName}. Check the list and try again.`,
    )
    expect(giveRefusalFor(new GiveItemNotFoundError(), itemName)).toBe(`We couldn't find ${itemName}. It may have been deleted.`)
    expect(giveRefusalFor(new Error('boom'), itemName)).toBe(`We couldn't give ${itemName}. Try again.`)
  })
})

describe('useGiveItemFlow', () => {
  const callbacks = { onGiven: vi.fn(), onRefetch: vi.fn() }
  const setup = (error: unknown = null, isPending = false) => {
    mockUseGive.mockReturnValue({ mutate, reset, isPending, error })
    return renderHook(() => useGiveItemFlow('c1', present, [], callbacks))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = '<button id="give-trigger-k1">Give...</button>'
  })

  it('opens a request and cancels it without giving', () => {
    const { result } = setup()

    act(() => result.current.open(request))
    expect(result.current.request).toEqual(request)
    act(() => result.current.cancel())

    expect(result.current.request).toBeNull()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('gives to the chosen Investigator, then closes and tells the page who received it', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onSuccess: () => void }) => handlers.onSuccess())
    const { result } = setup()
    act(() => result.current.open(request))

    act(() => result.current.confirm('i1'))

    expect(mutate).toHaveBeenCalledWith({ itemId: 'k1', investigatorId: 'i1' }, expect.anything())
    expect(callbacks.onGiven).toHaveBeenCalledWith(`${itemName} given to Harvey Walters.`)
    expect(result.current.request).toBeNull()
  })

  it('says "Moved to Revealed." when the give completes the Item for everyone present', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onSuccess: () => void }) => handlers.onSuccess())
    mockUseGive.mockReturnValue({ mutate, reset, isPending: false, error: null })
    const { result } = renderHook(() => useGiveItemFlow('c1', present, [itemReveal(['i2'])], callbacks))
    act(() => result.current.open(request))

    act(() => result.current.confirm('i1'))

    expect(callbacks.onGiven).toHaveBeenCalledWith(`${itemName} given to Harvey Walters. Moved to Revealed.`)
  })

  it('does nothing when confirmed with no request', () => {
    const { result } = setup()

    act(() => result.current.confirm('i1'))

    expect(mutate).not.toHaveBeenCalled()
  })

  it.each([[new GiveItemConflictError()], [new GiveItemRefusedError('itemId')], [new GiveItemRefusedError('investigatorId')]])(
    'asks the page to refetch after a race or refusal and keeps the dialog open',
    (error) => {
      mutate.mockImplementation((_input: unknown, handlers: { onError: (error: Error) => void }) => handlers.onError(error))
      const { result } = setup()
      act(() => result.current.open(request))

      act(() => result.current.confirm('i1'))

      expect(callbacks.onRefetch).toHaveBeenCalledTimes(1)
      expect(result.current.request).toEqual(request)
    },
  )

  it('does not refetch when the Item is gone or another failure happens', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onError: (error: Error) => void }) => handlers.onError(new GiveItemNotFoundError()))
    const { result } = setup()
    act(() => result.current.open(request))

    act(() => result.current.confirm('i1'))

    expect(callbacks.onRefetch).not.toHaveBeenCalled()
  })

  it('shows the refusal for the open request, and none once closed', () => {
    const { result } = setup(new GiveItemRefusedError('investigatorId'))
    expect(result.current.refusal).toBeNull()

    act(() => result.current.open(request))

    expect(result.current.refusal).toBe(`That Investigator is no longer present or already holds ${itemName}. Check the list and try again.`)
  })

  it('returns focus to the trigger, falling back across the list (SPL-A11Y-17)', () => {
    const { result } = setup()
    act(() => result.current.open(request, { fallbackIds: ['next-title', 'sub-tab'] }))

    act(() => result.current.returnFocus(new Event('focus')))
    expect(document.activeElement?.id).toBe('give-trigger-k1')

    document.getElementById('give-trigger-k1')?.remove()
    document.body.innerHTML += '<h2 id="sub-tab" tabindex="-1">To reveal</h2><button id="next-title">Next</button>'
    act(() => result.current.returnFocus(new Event('focus')))
    expect(document.activeElement?.id).toBe('next-title')
  })

  it('reports the in-flight state', () => {
    const { result } = setup(null, true)

    expect(result.current.pending).toBe(true)
  })
})
