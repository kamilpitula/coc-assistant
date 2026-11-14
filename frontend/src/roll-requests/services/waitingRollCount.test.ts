import { describe, expect, it } from 'vitest'

import type { RollRequest } from '@/roll-requests/types/RollRequest'

import { cancelledRollsReport, countWaitingRolls, waitingRollsToCancelSentence } from './waitingRollCount'

// specs/roll-requests/ux.md section 17 and specs/scene-play/ux.md section 24: the counts behind the badge, the finish
// dialog, the present report, and the start page hint.
function rollRequest(id: string, statuses: Array<'Waiting' | 'Rolled' | 'Cancelled'>, investigators = ['harvey', 'lucy']): RollRequest {
  return {
    id,
    target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
    message: null,
    visibility: 'Public',
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt: '2026-11-14T19:21:00Z',
    requestedRolls: statuses.map((status, index) => ({
      investigatorId: investigators[index % investigators.length] ?? 'harvey',
      investigatorName: 'Harvey Walters',
      targetValue: 60,
      usesBaseValue: false,
      canEarnExperienceCheck: true,
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      status,
      rolls: [],
    })),
  }
}

describe('countWaitingRolls', () => {
  it('counts every Waiting roll of the requests', () => {
    expect(countWaitingRolls([rollRequest('r1', ['Waiting', 'Rolled']), rollRequest('r2', ['Waiting', 'Cancelled'])])).toBe(2)
  })

  it('counts zero when nothing waits', () => {
    expect(countWaitingRolls([rollRequest('r1', ['Rolled', 'Cancelled'])])).toBe(0)
    expect(countWaitingRolls([])).toBe(0)
  })

  it('counts only the given Investigators when asked', () => {
    expect(countWaitingRolls([rollRequest('r1', ['Waiting', 'Waiting'])], ['lucy'])).toBe(1)
  })

  it('is unknown while the requests are loading', () => {
    expect(countWaitingRolls(undefined)).toBeUndefined()
    expect(countWaitingRolls(null)).toBeUndefined()
  })
})

describe('waitingRollsToCancelSentence', () => {
  it('names the count for one and for several', () => {
    expect(waitingRollsToCancelSentence(1)).toBe('1 waiting roll will be cancelled.')
    expect(waitingRollsToCancelSentence(2)).toBe('2 waiting rolls will be cancelled.')
  })

  it('says nothing when no roll waits', () => {
    expect(waitingRollsToCancelSentence(0)).toBeNull()
  })

  it('warns in general while the count is unknown', () => {
    expect(waitingRollsToCancelSentence(undefined)).toBe('Any waiting rolls will be cancelled.')
  })
})

describe('cancelledRollsReport', () => {
  it('names the count for one and for several', () => {
    expect(cancelledRollsReport(1)).toBe('Investigators present saved. 1 waiting roll cancelled.')
    expect(cancelledRollsReport(2)).toBe('Investigators present saved. 2 waiting rolls cancelled.')
  })
})
