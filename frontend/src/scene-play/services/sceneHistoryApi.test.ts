import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSceneHistory, sceneHistoryQueryKeys, SceneHistoryNotFoundError } from './sceneHistoryApi'

// specs/scene-play/spec.md (API Contracts: Scene History) and PBI-SPL-004 design record D-single-option (shapes).
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const keeperReveal = {
  revealId: 'r1',
  revealedAt: '2026-11-07T19:20:00Z',
  subjectType: 'Handout',
  title: 'The cellar door',
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [{ id: 'i1', name: 'Harvey Walters' }],
}

const publicRollRequest = {
  id: 'q1',
  target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
  message: 'Something moves upstairs.',
  visibility: 'Public',
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 0,
  createdAt: '2026-11-07T19:14:00Z',
  requestedRolls: [
    {
      investigatorId: 'i1',
      investigatorName: 'Harvey Walters',
      targetValue: 60,
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
    },
  ],
}

const keeperOnlyRollRequest = {
  ...publicRollRequest,
  id: 'q2',
  visibility: 'KeeperOnly',
}

const keeperScene = {
  sceneId: 's2',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  startedAt: '2026-11-07T19:05:00Z',
  finishedAt: null,
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
  reveals: [keeperReveal],
  rollRequests: [keeperOnlyRollRequest, publicRollRequest],
}

const playerScene = {
  sceneId: 's2',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  startedAt: '2026-11-07T19:05:00Z',
  finishedAt: null,
  reveals: [
    {
      revealId: 'r1',
      revealedAt: '2026-11-07T19:20:00Z',
      subjectType: 'Handout',
      title: 'The cellar door',
      handoutKind: 'ReadAloud',
      content: null,
      file: null,
      imageDescription: null,
    },
  ],
  rollRequests: [publicRollRequest],
}

describe('scene history API', () => {
  const fetchMock = vi.fn()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('reads the Keeper history with its token: every Scene with its present list and every Reveal', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { scenes: [keeperScene] }))

    const history = await getSceneHistory('token', 'c1')

    expect(history).toEqual({ kind: 'keeper', scenes: [keeperScene] })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/campaigns/c1/scene-history')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer token' })
  })

  it('reads the Player history with their Investigator name and only their Reveals', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { investigatorName: 'Harvey Walters', scenes: [playerScene] }))

    const history = await getSceneHistory('token', 'c1')

    expect(history).toEqual({ kind: 'player', investigatorName: 'Harvey Walters', scenes: [playerScene] })
  })

  it('parses each Scene with its Reveals and its Roll Requests, newest first', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { scenes: [keeperScene] }))

    const history = await getSceneHistory('token', 'c1')

    expect(history).toEqual({ kind: 'keeper', scenes: [keeperScene] })
    expect(history.kind === 'keeper' && history.scenes[0].rollRequests.map((request) => request.id)).toEqual(['q2', 'q1'])
  })

  it('rejects a Player Scene carrying a Keeper-only Roll Request (RR-UX-19)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { investigatorName: 'Harvey Walters', scenes: [{ ...playerScene, rollRequests: [keeperOnlyRollRequest] }] }),
    )

    await expect(getSceneHistory('token', 'c1')).rejects.toThrow()
  })

  it('rejects a Player Roll Request with a field the contract does not name (strict)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        investigatorName: 'Harvey Walters',
        scenes: [{ ...playerScene, rollRequests: [{ ...publicRollRequest, rollerAccountId: 'a1' }] }],
      }),
    )

    await expect(getSceneHistory('token', 'c1')).rejects.toThrow()
  })

  it('rejects a Keeper Scene that carries no present list, and a Player Scene that does', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { scenes: [playerScene] }))

    await expect(getSceneHistory('token', 'c1')).rejects.toThrow()
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { investigatorName: 'Harvey Walters', scenes: [{ ...playerScene, investigatorsPresent: [] }] }),
    )

    await expect(getSceneHistory('token', 'c1')).rejects.toThrow()
  })

  it('rejects an answer with a field the contract does not name (strict)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { scenes: [{ ...keeperScene, location: 'Boston Road' }] }))

    await expect(getSceneHistory('token', 'c1')).rejects.toThrow()
  })

  it('maps 404 to the not-found error, for a caller who is not a member', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404))

    await expect(getSceneHistory('token', 'c1')).rejects.toBeInstanceOf(SceneHistoryNotFoundError)
  })

  it('fails other answers with their status', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500))

    await expect(getSceneHistory('token', 'c1')).rejects.toThrow('Failed to load the Scene History (500)')
  })

  it('names the history query of the Campaign', () => {
    expect(sceneHistoryQueryKeys.detail('c1')).toEqual(['campaigns', 'c1', 'scene-history'])
  })
})
