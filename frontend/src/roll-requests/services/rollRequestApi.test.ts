import { afterEach, describe, expect, it, vi } from 'vitest'

import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'

import type { RollRequestTarget } from '@/roll-requests/types/RollRequest'

import {
  AlreadyRolledError,
  AskPushRefusedError,
  PushAlreadyRuledError,
  PushNotAllowedError,
  RequestedRollCancelledError,
  RequestedRollGoneError,
  RollRequestRefusedError,
  approvePush,
  askToPush,
  cancelRequestedRoll,
  declinePush,
  getActiveSceneRollRequests,
  getMyPushableRolls,
  getMyRequestedRolls,
  getRollRequest,
  requestRoll,
  rollRequestQueryKeys,
  rollRequestedRoll,
} from './rollRequestApi'

// specs/roll-requests/spec.md, API Contracts.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const target: RollRequestTarget = { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null }

const requestedRoll = {
  investigatorId: 'i1',
  investigatorName: 'Harvey Walters',
  targetValue: 45,
  usesBaseValue: false,
  canEarnExperienceCheck: true,
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 0,
  status: 'Waiting',
  pushJustification: null,
  pushBonusDice: null,
  pushPenaltyDice: null,
  canBePushed: false,
  rolls: [],
}

const rollRequest = {
  id: 'r1',
  target,
  message: 'Something moves upstairs.',
  visibility: 'Public',
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 0,
  createdAt: '2026-11-12T19:21:00Z',
  requestedRolls: [requestedRoll],
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(handler)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('rollRequestQueryKeys', () => {
  it('names all, detail, activeScene, mine, and pushable queries under the Campaign', () => {
    expect(rollRequestQueryKeys.all('c1')).toEqual(['campaigns', 'c1', 'roll-requests'])
    expect(rollRequestQueryKeys.detail('c1', 'r1')).toEqual(['campaigns', 'c1', 'roll-requests', 'r1'])
    expect(rollRequestQueryKeys.activeScene('c1')).toEqual(['campaigns', 'c1', 'roll-requests', 'active-scene'])
    expect(rollRequestQueryKeys.mine('c1')).toEqual(['campaigns', 'c1', 'roll-requests', 'mine'])
    expect(rollRequestQueryKeys.pushable('c1')).toEqual(['campaigns', 'c1', 'roll-requests', 'pushable'])
  })
})

describe('requestRoll', () => {
  it.each(['Public', 'KeeperOnly'] as const)('posts the visibility %s with the target and investigators', async (visibility) => {
    const fetchMock = stubFetch(() => jsonResponse(201, rollRequest))

    const created = await requestRoll('token', 'c1', {
      target,
      message: 'Something moves upstairs.',
      visibility,
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      investigators: [{ investigatorId: 'i1' }],
    })

    expect(created).toEqual(rollRequest)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/active-scene/roll-requests')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      target,
      message: 'Something moves upstairs.',
      visibility,
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      investigators: [{ investigatorId: 'i1' }],
    })
  })

  it('throws NoActiveSceneError when no Scene is Active (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'No Scene is Active.' }))

    await expect(
      requestRoll('token', 'c1', { target, visibility: 'Public', difficulty: 'Regular', bonusDice: 0, penaltyDice: 0, investigators: [] }),
    ).rejects.toBeInstanceOf(NoActiveSceneError)
  })

  it('throws RollRequestRefusedError with the reasons when the request is refused (400, RR-UX-6)', async () => {
    stubFetch(() =>
      jsonResponse(400, { errors: { investigators: ['Only Investigators present can be asked to roll.'] } }),
    )

    const refusal = await requestRoll('token', 'c1', {
      target,
      visibility: 'Public',
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      investigators: [],
    }).catch((error: unknown) => error)

    expect(refusal).toBeInstanceOf(RollRequestRefusedError)
    expect((refusal as RollRequestRefusedError).message).toContain('Only Investigators present can be asked to roll.')
  })

  it('rejects a request with a field beyond the contract so extra data is never passed on', async () => {
    stubFetch(() => jsonResponse(201, { ...rollRequest, createdByAccountId: 'a1' }))

    await expect(
      requestRoll('token', 'c1', { target, visibility: 'Public', difficulty: 'Regular', bonusDice: 0, penaltyDice: 0, investigators: [] }),
    ).rejects.toThrow()
  })
})

describe('getRollRequest', () => {
  it('returns the request the caller may see', async () => {
    stubFetch(() => jsonResponse(200, rollRequest))

    const found = await getRollRequest('token', 'c1', 'r1')

    expect(found).toEqual(rollRequest)
  })

  it('returns null when the request is gone or not visible (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    expect(await getRollRequest('token', 'c1', 'r1')).toBeNull()
  })
})

describe('getActiveSceneRollRequests', () => {
  it('returns the Active Scene requests, oldest first', async () => {
    stubFetch(() => jsonResponse(200, [rollRequest]))

    const requests = await getActiveSceneRollRequests('token', 'c1')

    expect(requests).toEqual([rollRequest])
  })

  it('returns null for anyone but the Keeper (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    expect(await getActiveSceneRollRequests('token', 'c1')).toBeNull()
  })
})

describe('getMyRequestedRolls', () => {
  it('returns the calling Player waiting rolls with the request target, message, and creation time', async () => {
    const mine = { investigatorName: 'Harvey Walters', rolls: [{ rollRequestId: 'r1', target, message: 'Listen.', createdAt: '2026-11-12T19:21:00Z', roll: requestedRoll }] }
    stubFetch(() => jsonResponse(200, mine))

    expect(await getMyRequestedRolls('token', 'c1')).toEqual(mine)
  })

  it('rejects a mine row without the request creation time', async () => {
    const mine = { investigatorName: 'Harvey Walters', rolls: [{ rollRequestId: 'r1', target, message: 'Listen.', roll: requestedRoll }] }
    stubFetch(() => jsonResponse(200, mine))

    await expect(getMyRequestedRolls('token', 'c1')).rejects.toThrow()
  })

  it('returns null without an Approved Investigator (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    expect(await getMyRequestedRolls('token', 'c1')).toBeNull()
  })
})

describe('rollRequestedRoll', () => {
  const rolled = {
    ...requestedRoll,
    status: 'Rolled',
    rolls: [
      {
        dice: '1d100',
        result: 25,
        faces: [20, 5],
        rolledBy: 'Eleanor Hart',
        rolledAt: '2026-11-12T19:22:00Z',
        percentile: { unitsFace: 5, tensFaces: [20], keptTens: 20, result: 25, successLevel: 'Hard', isSuccess: true },
        earnsExperienceCheck: true,
        isPushed: false,
      },
    ],
  }

  it('posts the roll and returns the rolled Requested Roll', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, rolled))

    expect(await rollRequestedRoll('token', 'c1', 'r1', 'i1')).toEqual(rolled)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/roll-requests/r1/requested-rolls/i1/roll')
  })

  it('throws AlreadyRolledError when the roll was already made (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'Another change won the race. Fetch again and try again.' }))

    await expect(rollRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(AlreadyRolledError)
  })

  it('throws NoActiveSceneError when the Scene is no longer Active (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'No Scene is Active.' }))

    await expect(rollRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(NoActiveSceneError)
  })

  it('throws RequestedRollCancelledError when the roll was already cancelled (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'This roll was cancelled.' }))

    await expect(rollRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(RequestedRollCancelledError)
  })

  it('throws RequestedRollGoneError when the roll is gone or not visible (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    await expect(rollRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(RequestedRollGoneError)
  })
})

describe('cancelRequestedRoll', () => {
  const cancelled = { ...requestedRoll, status: 'Cancelled' }

  it('posts the cancel and returns the cancelled Requested Roll', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, cancelled))

    expect(await cancelRequestedRoll('token', 'c1', 'r1', 'i1')).toEqual(cancelled)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/roll-requests/r1/requested-rolls/i1/cancel')
  })

  it('throws RequestedRollCancelledError when the roll was already cancelled (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'This roll was cancelled.' }))

    await expect(cancelRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(RequestedRollCancelledError)
  })

  it('throws AlreadyRolledError when the roll was already made (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'Another change won the race. Fetch again and try again.' }))

    await expect(cancelRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(AlreadyRolledError)
  })

  it('throws NoActiveSceneError when the Scene is no longer Active (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'No Scene is Active.' }))

    await expect(cancelRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(NoActiveSceneError)
  })

  it('throws RequestedRollGoneError when the roll is gone or not visible (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    await expect(cancelRequestedRoll('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(RequestedRollGoneError)
  })
})

describe('getMyPushableRolls', () => {
  it('returns the rolls the Player can push with the request target, message, and creation time', async () => {
    const pushable = { ...requestedRoll, status: 'PushAsked', pushJustification: 'Trying again.', rolls: [] }
    const mine = { investigatorName: 'Harvey Walters', rolls: [{ rollRequestId: 'r1', target, message: 'Something moves upstairs.', createdAt: '2026-11-12T19:21:00Z', roll: pushable }] }
    stubFetch(() => jsonResponse(200, mine))

    expect(await getMyPushableRolls('token', 'c1')).toEqual(mine)
  })

  it('returns null without an Approved Investigator (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    expect(await getMyPushableRolls('token', 'c1')).toBeNull()
  })
})

describe('askToPush', () => {
  const pushAsked = { ...requestedRoll, status: 'PushAsked', pushJustification: 'Trying again.', rolls: [] }

  it('posts the justification and returns the PushAsked roll', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, pushAsked))

    expect(await askToPush('token', 'c1', 'r1', 'i1', 'Trying again.')).toEqual(pushAsked)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/roll-requests/r1/requested-rolls/i1/push')
    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ justification: 'Trying again.' }))
  })

  it('parses the push fields, the dice, and the pushed record', async () => {
    const pushed = {
      ...requestedRoll,
      status: 'Pushed',
      pushJustification: 'Trying again.',
      pushBonusDice: 1,
      pushPenaltyDice: 0,
      canBePushed: false,
      rolls: [
        {
          dice: '1D100',
          result: 81,
          faces: [80, 1],
          rolledBy: 'Harvey Walters',
          rolledAt: '2026-11-12T19:22:00Z',
          percentile: { unitsFace: 1, tensFaces: [80], keptTens: 80, result: 81, successLevel: 'Failure', isSuccess: false },
          earnsExperienceCheck: false,
          isPushed: false,
        },
      ],
    }
    stubFetch(() => jsonResponse(200, pushed))

    expect(await askToPush('token', 'c1', 'r1', 'i1', 'Trying again.')).toEqual(pushed)
  })

  it('rejects a row without the push fields', async () => {
    stubFetch(() => jsonResponse(200, { ...pushAsked, pushJustification: undefined }))

    await expect(askToPush('token', 'c1', 'r1', 'i1', 'Trying again.')).rejects.toThrow()
  })

  it('throws AskPushRefusedError with the reasons when the justification is refused (400)', async () => {
    stubFetch(() => jsonResponse(400, { errors: { justification: ['Tell the Keeper how the Investigator tries again.'] } }))

    const error = await askToPush('token', 'c1', 'r1', 'i1', '   ').catch((error: unknown) => error)
    expect(error).toBeInstanceOf(AskPushRefusedError)
    expect((error as Error).message).toBe("We couldn't ask for that push: Tell the Keeper how the Investigator tries again..")
  })

  it('throws PushNotAllowedError when the roll can no longer be pushed (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'Another change won the race. Fetch again and try again.' }))

    await expect(askToPush('token', 'c1', 'r1', 'i1', 'Trying again.')).rejects.toBeInstanceOf(PushNotAllowedError)
  })

  it('throws NoActiveSceneError when the Scene is no longer Active (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'No Scene is Active.' }))

    await expect(askToPush('token', 'c1', 'r1', 'i1', 'Trying again.')).rejects.toBeInstanceOf(NoActiveSceneError)
  })

  it('throws RequestedRollGoneError when the roll is gone or hidden (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    await expect(askToPush('token', 'c1', 'r1', 'i1', 'Trying again.')).rejects.toBeInstanceOf(RequestedRollGoneError)
  })
})

describe('approvePush', () => {
  const pushed = { ...requestedRoll, status: 'Pushed', pushJustification: 'Trying again.', pushBonusDice: 1, pushPenaltyDice: 0, rolls: [] }

  it('posts the dice and returns the Pushed roll', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, pushed))

    expect(await approvePush('token', 'c1', 'r1', 'i1', 1, 0)).toEqual(pushed)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/roll-requests/r1/requested-rolls/i1/push/approve')
    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ bonusDice: 1, penaltyDice: 0 }))
  })

  it('throws PushAlreadyRuledError when the push was already ruled on (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'Another change won the race. Fetch again and try again.' }))

    await expect(approvePush('token', 'c1', 'r1', 'i1', 1, 0)).rejects.toBeInstanceOf(PushAlreadyRuledError)
  })

  it('throws NoActiveSceneError when the Scene is no longer Active (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'No Scene is Active.' }))

    await expect(approvePush('token', 'c1', 'r1', 'i1', 1, 0)).rejects.toBeInstanceOf(NoActiveSceneError)
  })

  it('throws RequestedRollCancelledError when the roll was cancelled (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'This roll was cancelled.' }))

    await expect(approvePush('token', 'c1', 'r1', 'i1', 1, 0)).rejects.toBeInstanceOf(RequestedRollCancelledError)
  })
})

describe('declinePush', () => {
  const declined = { ...requestedRoll, status: 'Rolled', pushJustification: 'Trying again.', rolls: [] }

  it('posts the decline and returns the Rolled roll', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, declined))

    expect(await declinePush('token', 'c1', 'r1', 'i1')).toEqual(declined)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/roll-requests/r1/requested-rolls/i1/push/decline')
  })

  it('throws PushAlreadyRuledError when the push was already ruled on (409)', async () => {
    stubFetch(() => jsonResponse(409, { title: 'Another change won the race. Fetch again and try again.' }))

    await expect(declinePush('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(PushAlreadyRuledError)
  })

  it('throws RequestedRollGoneError when the roll is gone (404)', async () => {
    stubFetch(() => jsonResponse(404, {}))

    await expect(declinePush('token', 'c1', 'r1', 'i1')).rejects.toBeInstanceOf(RequestedRollGoneError)
  })
})
