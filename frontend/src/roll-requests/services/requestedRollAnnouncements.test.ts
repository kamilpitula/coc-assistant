import { describe, expect, it } from 'vitest'

import type { WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'

import { describeNewRequestedRolls, findNewRequestedRolls } from './requestedRollAnnouncements'

// specs/roll-requests/ux.md section 8; RR-UX-13, RR-A11Y-5.
function waitingRoll(rollRequestId: string, investigatorId: string, skill = 'Spot Hidden'): WaitingRequestedRoll {
  return {
    rollRequestId,
    target: { kind: 'Skill', skill, specialization: null, characteristic: null },
    message: null,
    createdAt: '2026-11-12T19:21:00Z',
    roll: {
      investigatorId,
      investigatorName: 'Harvey Walters',
      targetValue: 60,
      usesBaseValue: false,
      canEarnExperienceCheck: true,
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      status: 'Waiting',
      rolls: [],
    },
  }
}

describe('findNewRequestedRolls', () => {
  it('announces nothing on first load: the first fetched list is the baseline', () => {
    expect(findNewRequestedRolls(undefined, [waitingRoll('r1', 'i1')])).toEqual([])
  })

  it('finds a roll that arrives in a later fetch', () => {
    const first = waitingRoll('r1', 'i1')

    expect(findNewRequestedRolls([first], [waitingRoll('r2', 'i1'), first])).toEqual([waitingRoll('r2', 'i1')])
  })

  it('ignores rolls that leave the list: results are never announced assertively', () => {
    const first = waitingRoll('r1', 'i1')

    expect(findNewRequestedRolls([first, waitingRoll('r2', 'i1')], [first])).toEqual([])
  })
})

describe('describeNewRequestedRolls', () => {
  it('names one roll with its Investigator and target, off the Active Scene page', () => {
    expect(describeNewRequestedRolls([waitingRoll('r1', 'i1')], 'Harvey Walters', false)).toBe(
      'Roll requested for Harvey Walters: Spot Hidden. Roll it on the Active Scene.',
    )
  })

  it('leaves the page direction out on the Active Scene page itself', () => {
    expect(describeNewRequestedRolls([waitingRoll('r1', 'i1')], 'Harvey Walters', true)).toBe(
      'Roll requested for Harvey Walters: Spot Hidden.',
    )
  })

  it('merges several rolls into one count, off the Active Scene page', () => {
    expect(
      describeNewRequestedRolls([waitingRoll('r1', 'i1'), waitingRoll('r2', 'i1', 'Listen')], 'Harvey Walters', false),
    ).toBe('2 rolls requested for Harvey Walters. Roll them on the Active Scene.')
  })

  it('merges several rolls into one count on the Active Scene page itself', () => {
    expect(
      describeNewRequestedRolls([waitingRoll('r1', 'i1'), waitingRoll('r2', 'i1', 'Listen')], 'Harvey Walters', true),
    ).toBe('2 rolls requested for Harvey Walters.')
  })
})
