import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RequestedRoll, RollRequestTarget, WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'

import { useRequestedRollAnnouncement } from './useRequestedRollAnnouncement'

// specs/roll-requests/ux.md section 8 (RR-UX-13): announcements derived from the waiting list before and after a refetch.

const listen: RollRequestTarget = { kind: 'Skill', skill: 'Listen', specialization: null, characteristic: null }
const spotHidden: RollRequestTarget = { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null }

function waitingRoll(rollRequestId: string, investigatorId: string, minute = 0, target: RollRequestTarget = listen): WaitingRequestedRoll {
  const roll: RequestedRoll = {
    investigatorId,
    investigatorName: 'Harvey Walters',
    targetValue: 25,
    usesBaseValue: false,
    canEarnExperienceCheck: false,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Waiting',
    rolls: [],
  }
  return { rollRequestId, target, message: null, createdAt: new Date(Date.UTC(2026, 9, 16, 19, minute)).toISOString(), roll }
}

const first = waitingRoll('r1', 'harvey')
const second = waitingRoll('r2', 'harvey', 1, spotHidden)
const third = waitingRoll('r3', 'harvey', 2)
const fourth = waitingRoll('r4', 'harvey', 3)

interface AnnouncementProps {
  rolls: readonly WaitingRequestedRoll[] | undefined
  fetched: boolean
  name: string | null
  onActiveScenePage: boolean
}

function setup(initial: Partial<AnnouncementProps> = {}) {
  const props: AnnouncementProps = { rolls: undefined, fetched: false, name: 'Harvey Walters', onActiveScenePage: false, ...initial }
  return renderHook(
    (hookProps: AnnouncementProps) => useRequestedRollAnnouncement(hookProps.rolls, hookProps.fetched, hookProps.name, hookProps.onActiveScenePage),
    { initialProps: props },
  )
}

describe('useRequestedRollAnnouncement', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('announces nothing for rolls shown before the waiting list has been fetched since opening, nor for the fetch itself', () => {
    const { result, rerender } = setup({ rolls: [first] })

    rerender({ rolls: [first, second], fetched: false, name: 'Harvey Walters', onActiveScenePage: false })
    rerender({ rolls: [second, first], fetched: true, name: 'Harvey Walters', onActiveScenePage: false })

    expect(result.current.message).toBe('')
  })

  it('announces one new roll at once, with the direction away from the Active Scene', () => {
    const { result, rerender } = setup({ rolls: [first], fetched: true })

    rerender({ rolls: [second, first], fetched: true, name: 'Harvey Walters', onActiveScenePage: false })

    expect(result.current.message).toBe('Roll requested for Harvey Walters: Spot Hidden. Roll it on the Active Scene.')
  })

  it('leaves the direction out on the Active Scene page itself', () => {
    const { result, rerender } = setup({ rolls: [first], fetched: true })

    rerender({ rolls: [second, first], fetched: true, name: 'Harvey Walters', onActiveScenePage: true })

    expect(result.current.message).toBe('Roll requested for Harvey Walters: Spot Hidden.')
  })

  it('merges rolls arriving within 5 seconds into one message at the end of the window, then announces at once again', () => {
    const { result, rerender } = setup({ rolls: [first], fetched: true })
    rerender({ rolls: [second, first], fetched: true, name: 'Harvey Walters', onActiveScenePage: false })

    rerender({ rolls: [third, second, first], fetched: true, name: 'Harvey Walters', onActiveScenePage: false })
    act(() => vi.advanceTimersByTime(2000))
    rerender({ rolls: [fourth, third, second, first], fetched: true, name: 'Harvey Walters', onActiveScenePage: false })
    expect(result.current.message).toBe('Roll requested for Harvey Walters: Spot Hidden. Roll it on the Active Scene.')

    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.message).toBe('2 rolls requested for Harvey Walters. Roll them on the Active Scene.')

    act(() => vi.advanceTimersByTime(5000))
    const later = waitingRoll('later', 'harvey', 9)
    rerender({ rolls: [later, fourth, third, second, first], fetched: true, name: 'Harvey Walters', onActiveScenePage: false })
    expect(result.current.message).toBe('Roll requested for Harvey Walters: Listen. Roll it on the Active Scene.')
  })

  it('does not announce rolls leaving the list', () => {
    const { result, rerender } = setup({ rolls: [second, first], fetched: true })

    rerender({ rolls: [first], fetched: true, name: 'Harvey Walters', onActiveScenePage: false })

    expect(result.current.message).toBe('')
  })
})
