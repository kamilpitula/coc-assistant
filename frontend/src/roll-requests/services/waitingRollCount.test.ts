import { describe, expect, it } from 'vitest'

import type { RequestedRollStatus, RollRequest } from '@/roll-requests/types/RollRequest'

import { closingRollsSentence, countClosingRolls, countKeeperOpenRolls, presentSavedReport } from './waitingRollCount'

// specs/roll-requests/ux.md section 19.6 and specs/scene-play/ux.md section 24: the counts behind the Keeper badge,
// the finish dialog, the start page hint, and the present report.
function rollRequest(id: string, statuses: RequestedRollStatus[], investigators = ['harvey', 'lucy']): RollRequest {
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
      pushJustification: null,
      pushBonusDice: null,
      pushPenaltyDice: null,
      canBePushed: false,
      rolls: [],
    })),
  }
}

describe('countKeeperOpenRolls', () => {
  it('counts Waiting, PushAsked, and Pushed rows (RR-UX-31)', () => {
    expect(countKeeperOpenRolls([rollRequest('r1', ['Waiting', 'Rolled']), rollRequest('r2', ['PushAsked', 'Pushed', 'Cancelled'])])).toBe(3)
  })

  it('counts zero when nothing is open', () => {
    expect(countKeeperOpenRolls([rollRequest('r1', ['Rolled', 'Cancelled'])]))
      .toBe(0)
    expect(countKeeperOpenRolls([])).toBe(0)
  })

  it('is unknown while the requests are loading', () => {
    expect(countKeeperOpenRolls(undefined)).toBeUndefined()
    expect(countKeeperOpenRolls(null)).toBeUndefined()
  })
})

describe('countClosingRolls', () => {
  it('counts Waiting and Pushed as cancelled and PushAsked as declined', () => {
    expect(countClosingRolls([rollRequest('r1', ['Waiting', 'Pushed', 'PushAsked', 'Rolled', 'Cancelled'])]))
      .toEqual({ cancelled: 2, declined: 1 })
  })

  it('counts only the given Investigators when asked', () => {
    expect(countClosingRolls([rollRequest('r1', ['Waiting', 'PushAsked'])], ['lucy']))
      .toEqual({ cancelled: 0, declined: 1 })
  })

  it('is unknown while the requests are loading', () => {
    expect(countClosingRolls(undefined)).toBeUndefined()
    expect(countClosingRolls(null)).toBeUndefined()
  })
})

describe('closingRollsSentence', () => {
  it('names each count only when it is above 0', () => {
    expect(closingRollsSentence({ cancelled: 1, declined: 0 })).toBe('1 waiting roll will be cancelled.')
    expect(closingRollsSentence({ cancelled: 2, declined: 1 })).toBe('2 waiting rolls will be cancelled. 1 push will be declined.')
    expect(closingRollsSentence({ cancelled: 0, declined: 2 })).toBe('2 pushes will be declined.')
  })

  it('says nothing when both counts are 0', () => {
    expect(closingRollsSentence({ cancelled: 0, declined: 0 })).toBeNull()
  })

  it('warns generally while the counts are unknown', () => {
    expect(closingRollsSentence(undefined)).toBe('Any waiting rolls will be cancelled and any asked pushes declined.')
  })
})

describe('presentSavedReport', () => {
  it('names each count only when it is above 0', () => {
    expect(presentSavedReport({ cancelled: 0, declined: 0 })).toBe('Investigators present saved.')
    expect(presentSavedReport({ cancelled: 1, declined: 0 })).toBe('Investigators present saved. 1 waiting roll cancelled.')
    expect(presentSavedReport({ cancelled: 2, declined: 3 })).toBe('Investigators present saved. 2 waiting rolls cancelled. 3 pushes declined.')
    expect(presentSavedReport({ cancelled: 0, declined: 1 })).toBe('Investigators present saved. 1 push declined.')
  })
})
