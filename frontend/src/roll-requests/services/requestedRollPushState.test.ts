import { describe, expect, it } from 'vitest'

import type { RequestedRoll } from '@/roll-requests/types/RollRequest'

import { requestedRollPushState } from './requestedRollPushState'

// specs/roll-requests/ux.md section 19.3: the card and the Scene History rows render from one client push state.
function roll(overrides: Partial<RequestedRoll>): RequestedRoll {
  return {
    investigatorId: 'harvey',
    investigatorName: 'Harvey Walters',
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: true,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Rolled',
    pushJustification: null,
    pushBonusDice: null,
    pushPenaltyDice: null,
    canBePushed: false,
    rolls: [],
    ...overrides,
  }
}

const firstRecord = {
  dice: '1D100',
  result: 81,
  faces: [80, 1],
  rolledBy: 'Harvey Walters',
  rolledAt: '2026-11-15T19:14:00Z',
  percentile: null,
  earnsExperienceCheck: null,
  isPushed: false,
}

const pushedRecord = { ...firstRecord, result: 15, isPushed: true }

describe('requestedRollPushState', () => {
  it('reads Waiting, PushAsked, and Pushed from the status', () => {
    expect(requestedRollPushState(roll({ status: 'Waiting' }))).toBe('Waiting')
    expect(requestedRollPushState(roll({ status: 'PushAsked', pushJustification: 'Trying again.', rolls: [firstRecord] }))).toBe('PushAsked')
    expect(requestedRollPushState(roll({ status: 'Pushed', pushJustification: 'Trying again.', rolls: [firstRecord] }))).toBe('Pushed')
  })

  it('reads a plain Rolled roll without a justification', () => {
    expect(requestedRollPushState(roll({ status: 'Rolled', rolls: [firstRecord] }))).toBe('Rolled')
  })

  it('reads a declined push from the kept justification with one record', () => {
    expect(requestedRollPushState(roll({ status: 'Rolled', pushJustification: 'Trying again.', rolls: [firstRecord] }))).toBe('PushDeclined')
  })

  it('reads a rolled pushed roll from the kept justification with two records', () => {
    expect(
      requestedRollPushState(roll({ status: 'Rolled', pushJustification: 'Trying again.', pushBonusDice: 1, pushPenaltyDice: 0, rolls: [firstRecord, pushedRecord] })),
    ).toBe('PushedRolled')
  })

  it('reads a Cancelled row without a record as Cancelled and one with a record as CancelledAfterPush', () => {
    expect(requestedRollPushState(roll({ status: 'Cancelled' }))).toBe('Cancelled')
    expect(requestedRollPushState(roll({ status: 'Cancelled', pushJustification: 'Trying again.', rolls: [firstRecord] }))).toBe('CancelledAfterPush')
  })
})
