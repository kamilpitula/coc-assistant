import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RevealInvestigatorsRefusedError, RevealSceneFinishedError, RevealSubjectRefusedError } from '@/scene-play/services/revealApi'

import { revealFailureMessage, revealRefusalFor, REVEAL_REFUSALS, useRevealFlow, type RevealTarget } from './useRevealFlow'

// specs/scene-play/ux.md section 13; SPL-UX-22, SPL-UX-24, SPL-UX-36.
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
    expect(revealRefusalFor(new RevealSubjectRefusedError(), 'X')).toBe(REVEAL_REFUSALS.subject)
    expect(revealRefusalFor(new RevealInvestigatorsRefusedError(), 'X')).toBe(REVEAL_REFUSALS.investigators)
    expect(revealRefusalFor(new Error('boom'), 'The front door')).toBe("We couldn't reveal The front door. Try again.")
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
    expect(callbacks.onRevealed).toHaveBeenCalledWith('The front door revealed to Harvey Walters and Lucy Ward.')
    expect(result.current.target).toBeNull()
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

  it('reports the in-flight state', () => {
    const { result } = setup(null, true)

    expect(result.current.pending).toBe(true)
  })
})
