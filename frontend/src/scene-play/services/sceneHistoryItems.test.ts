import { describe, expect, it } from 'vitest'

import type { RollRequest } from '@/roll-requests/types/RollRequest'
import { textReveal } from '@/scene-play/test-support/revealFixtures'

import { historyItems, withoutCancelledRolls } from './sceneHistoryItems'

// specs/roll-requests/ux.md RR-UX-24; specs/scene-play/ux.md SPL-UX-73, SPL-UX-75.
function waitingRequest(id: string, createdAt: string): RollRequest {
  return {
    id,
    target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
    message: null,
    visibility: 'Public',
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt,
    requestedRolls: [
      {
        investigatorId: 'i1',
        investigatorName: 'Harvey Walters',
        targetValue: 60,
        usesBaseValue: false,
        canEarnExperienceCheck: false,
        difficulty: 'Regular',
        bonusDice: 0,
        penaltyDice: 0,
        status: 'Waiting',
        rolls: [],
      },
    ],
  }
}

function cancelledRequest(id: string, createdAt: string): RollRequest {
  const request = waitingRequest(id, createdAt)
  return { ...request, requestedRolls: [{ ...request.requestedRolls[0], status: 'Cancelled' }] }
}

describe('withoutCancelledRolls', () => {
  it('removes Cancelled rows and keeps Waiting ones (RR-UX-24)', () => {
    const waiting = waitingRequest('q1', '2026-11-07T19:14:00Z').requestedRolls[0]
    const cancelled = { ...waiting, investigatorId: 'i2', investigatorName: 'Lucy Ward', status: 'Cancelled' as const }
    const request = { ...waitingRequest('q1', '2026-11-07T19:14:00Z'), requestedRolls: [waiting, cancelled] }

    const kept = withoutCancelledRolls(request)

    expect(kept?.requestedRolls).toEqual([waiting])
  })

  it('returns null when every row is Cancelled, so the card is not listed (SPL-UX-75)', () => {
    expect(withoutCancelledRolls(cancelledRequest('q1', '2026-11-07T19:14:00Z'))).toBeNull()
  })
})

describe('historyItems', () => {
  it('lists Reveals and Roll Requests newest first across both kinds (SPL-UX-73)', () => {
    const items = historyItems([{ ...textReveal, revealedAt: '2026-11-07T19:20:00Z' }], [waitingRequest('q1', '2026-11-07T19:14:00Z')])

    expect(items.map((item) => item.kind)).toEqual(['reveal', 'rollRequest'])
  })

  it('lists the newest item first however the kinds interleave (SPL-UX-73)', () => {
    const items = historyItems(
      [{ ...textReveal, revealId: 'r-old', revealedAt: '2026-11-07T19:10:00Z' }],
      [waitingRequest('q-new', '2026-11-07T19:14:00Z')],
    )

    expect(items.map((item) => item.id)).toEqual(['q-new', 'r-old'])
  })

  it('lists the Reveal first on equal times, then by id (SPL-UX-73)', () => {
    const items = historyItems(
      [
        { ...textReveal, revealId: 'r-b', revealedAt: '2026-11-07T19:14:00Z' },
        { ...textReveal, revealId: 'r-a', revealedAt: '2026-11-07T19:14:00Z' },
      ],
      [
        waitingRequest('q-b', '2026-11-07T19:14:00Z'),
        waitingRequest('q-a', '2026-11-07T19:14:00Z'),
      ],
    )

    expect(items.map((item) => item.id)).toEqual(['r-a', 'r-b', 'q-a', 'q-b'])
  })
})
