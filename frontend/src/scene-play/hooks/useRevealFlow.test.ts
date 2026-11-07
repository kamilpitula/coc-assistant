import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RevealConflictError, RevealInvestigatorsRefusedError, RevealSceneFinishedError, RevealSubjectRefusedError } from '@/scene-play/services/revealApi'

import { revealConflictMessage, revealFailureMessage, revealRefusalFor, REVEAL_REFUSALS, useRevealFlow, type RevealTarget } from './useRevealFlow'

// specs/scene-play/ux.md sections 13 and 21.7; SPL-UX-21, SPL-UX-22, SPL-UX-24, SPL-UX-36, SPL-UX-43, SPL-A11Y-17.
const { mockUseReveal, mutate, reset } = vi.hoisted(() => ({ mockUseReveal: vi.fn(), mutate: vi.fn(), reset: vi.fn() }))
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealToInvestigators: mockUseReveal }))

const present = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]
const target: RevealTarget = { subjectType: 'Handout', subjectId: 'h1', title: 'The front door', summary: 'Read-aloud', triggerId: 'reveal-trigger-h1' }

describe('revealRefusalFor', () => {
  it('says nothing without an error', () => {
    expect(revealRefusalFor(null, 'The front door')).toBeNull()
  })

  it('maps each refusal to its message and any other failure to the retry sentence', () => {
    expect(revealRefusalFor(new RevealSceneFinishedError(), 'X')).toBe(REVEAL_REFUSALS.finished)
    expect(revealRefusalFor(new RevealConflictError(), 'The front door')).toBe("The front door wasn't revealed: the Scene or the Item changed meanwhile.")
    expect(revealRefusalFor(new RevealSubjectRefusedError(), 'X')).toBe(REVEAL_REFUSALS.subject)
    expect(revealRefusalFor(new RevealInvestigatorsRefusedError(), 'X')).toBe(REVEAL_REFUSALS.investigators)
    expect(revealRefusalFor(new Error('boom'), 'The front door')).toBe("We couldn't reveal The front door. Try again.")
    expect(revealConflictMessage('X')).toBe("X wasn't revealed: the Scene or the Item changed meanwhile.")
    expect(revealFailureMessage('X')).toBe("We couldn't reveal X. Try again.")
  })
})

describe('useRevealFlow', () => {
  const callbacks = { onRevealed: vi.fn(), onSceneFinished: vi.fn(), onRefetch: vi.fn() }
  const setup = (error: unknown = null, isPending = false) => {
    mockUseReveal.mockReturnValue({ mutate, reset, isPending, error })
    return renderHook(() => useRevealFlow('c1', present, callbacks))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = '<button id="reveal-trigger-h1">Reveal</button>'
  })

  it('opens a target and cancels it without revealing', () => {
    const { result } = setup()

    act(() => result.current.open(target))
    expect(result.current.target).toEqual(target)
    act(() => result.current.cancel())

    expect(result.current.target).toBeNull()
    expect(mutate).not.toHaveBeenCalled()
    expect(callbacks.onSceneFinished).not.toHaveBeenCalled()
  })

  it('reveals with explicit Investigators, then closes and tells the page who received it', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onSuccess: () => void }) => handlers.onSuccess())
    const { result } = setup()
    act(() => result.current.open(target))

    act(() => result.current.confirm(['i1', 'i2']))

    expect(mutate).toHaveBeenCalledWith({ subjectType: 'Handout', subjectId: 'h1', investigatorIds: ['i1', 'i2'] }, expect.anything())
    expect(callbacks.onRevealed).toHaveBeenCalledWith('The front door revealed to Harvey Walters and Lucy Ward. Moved to Revealed.')
    expect(result.current.target).toBeNull()
  })

  it('says "Moved to Revealed." when the chosen Investigators complete the subject (SPL-UX-43)', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onSuccess: () => void }) => handlers.onSuccess())
    const { result } = setup()
    act(() => result.current.open(target, { alreadyRevealedIds: ['i1'], fallbackIds: [] }))

    act(() => result.current.confirm(['i2']))

    expect(callbacks.onRevealed).toHaveBeenCalledWith('The front door revealed to Lucy Ward. Moved to Revealed.')
  })

  it('omits the suffix while someone present is still missing it', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onSuccess: () => void }) => handlers.onSuccess())
    const { result } = setup()
    act(() => result.current.open(target, { alreadyRevealedIds: [], fallbackIds: [] }))

    act(() => result.current.confirm(['i1']))

    expect(callbacks.onRevealed).toHaveBeenCalledWith('The front door revealed to Harvey Walters.')
  })

  it('does nothing when confirmed with no target', () => {
    const { result } = setup()

    act(() => result.current.confirm(['i1']))

    expect(mutate).not.toHaveBeenCalled()
  })

  it.each([[new RevealSubjectRefusedError()], [new RevealInvestigatorsRefusedError()]])('asks the page to refetch after a 400 and keeps the dialog open', (error) => {
    mutate.mockImplementation((_input: unknown, handlers: { onError: (error: Error) => void }) => handlers.onError(error))
    const { result } = setup()
    act(() => result.current.open(target))

    act(() => result.current.confirm(['i1']))

    expect(callbacks.onRefetch).toHaveBeenCalledTimes(1)
    expect(result.current.target).toEqual(target)
  })

  it('asks the page to refetch after a lost write and keeps the dialog open', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onError: (error: Error) => void }) => handlers.onError(new RevealConflictError()))
    const { result } = setup()
    act(() => result.current.open(target))

    act(() => result.current.confirm(['i1']))

    expect(callbacks.onRefetch).toHaveBeenCalledTimes(1)
    expect(callbacks.onSceneFinished).not.toHaveBeenCalled()
    expect(result.current.target).toEqual(target)
  })

  it('does not refetch for a finished Scene or another failure', () => {
    mutate.mockImplementation((_input: unknown, handlers: { onError: (error: Error) => void }) => handlers.onError(new RevealSceneFinishedError()))
    const { result } = setup()
    act(() => result.current.open(target))

    act(() => result.current.confirm(['i1']))

    expect(callbacks.onRefetch).not.toHaveBeenCalled()
  })

  it('shows the refusal for the open target, and none once closed', () => {
    const { result } = setup(new RevealSubjectRefusedError())
    expect(result.current.refusal).toBeNull()

    act(() => result.current.open(target))

    expect(result.current.refusal).toBe(REVEAL_REFUSALS.subject)
  })

  it('tells the page the Scene is gone when the dialog is closed after a 409, and returns focus to the trigger otherwise', () => {
    const { result } = setup(new RevealSceneFinishedError())
    act(() => result.current.open(target))
    const event = new Event('focus')

    act(() => result.current.returnFocus(event))
    expect(document.activeElement?.id).toBe('reveal-trigger-h1')

    act(() => result.current.cancel())
    expect(callbacks.onSceneFinished).toHaveBeenCalledTimes(1)
    expect(reset).toHaveBeenCalled()
  })

  it.each([
    { gone: ['reveal-trigger-h1'], expected: 'next-title' },
    { gone: ['reveal-trigger-h1', 'next-title'], expected: 'prev-title' },
    { gone: ['reveal-trigger-h1', 'next-title', 'prev-title'], expected: 'sub-tab' },
  ])('falls back to the next title, then the previous one, then the sub-tab h2 when the trigger is gone (SPL-A11Y-17)', ({ gone, expected }) => {
    document.body.innerHTML =
      '<button id="reveal-trigger-h1">Reveal</button><h2 id="sub-tab" tabindex="-1">To reveal</h2><button id="prev-title">Prev</button><button id="next-title">Next</button>'
    for (const id of gone) {
      document.getElementById(id)?.remove()
    }
    const { result } = setup()
    act(() => result.current.open(target, { alreadyRevealedIds: [], fallbackIds: ['next-title', 'prev-title', 'sub-tab'] }))

    act(() => result.current.returnFocus(new Event('focus')))

    expect(document.activeElement?.id).toBe(expected)
  })

  it('reports the in-flight state', () => {
    const { result } = setup(null, true)

    expect(result.current.pending).toBe(true)
  })
})
