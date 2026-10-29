import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activeSceneQueryKeys,
  AnotherSceneActiveError,
  changeInvestigatorsPresent,
  finishActiveScene,
  getActiveScene,
  InvestigatorsRefusedError,
  NoActiveSceneError,
  SceneNotPreparedError,
  startScene,
} from './activeSceneApi'

// specs/scene-play/spec.md (API Contracts) and the PBI-SPL-001 design record: shapes, 204, 400, and 409.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const keeperScene = {
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: null }],
  reveals: [],
}
const presentScene = {
  isPresent: true,
  title: 'The Corbitt House',
  location: 'Arkham',
  investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }],
  reveals: [],
}
const absentScene = { title: 'The Corbitt House', isPresent: false }

describe('active scene API', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  describe('getActiveScene', () => {
    it('reads the Keeper shape and tells the three shapes apart', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, keeperScene))

      const result = await getActiveScene('token', 'c1')

      expect(result).toEqual({ kind: 'keeper', ...keeperScene })
      expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/active-scene', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }))
    })

    it('reads the present Player shape', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, presentScene))

      expect(await getActiveScene('token', 'c1')).toEqual({ kind: 'present-player', title: 'The Corbitt House', location: 'Arkham', investigatorsPresent: presentScene.investigatorsPresent })
    })

    it('reads the not-present Player shape, which is only a title', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, absentScene))

      expect(await getActiveScene('token', 'c1')).toEqual({ kind: 'absent-player', title: 'The Corbitt House' })
    })

    it('resolves to null when no Scene is Active (204)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204))

      expect(await getActiveScene('token', 'c1')).toBeNull()
    })

    it('rejects a body with a field the contract does not name', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...absentScene, location: 'Arkham' }))

      await expect(getActiveScene('token', 'c1')).rejects.toThrow()
    })

    it('fails on any other status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(500))

      await expect(getActiveScene('token', 'c1')).rejects.toThrow('Failed to load the Active Scene (500)')
    })
  })

  describe('startScene', () => {
    it('posts the present list and the finish choice and returns the Keeper view', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, keeperScene))

      const result = await startScene('token', 'c1', 's1', { presentInvestigatorIds: ['i1'], finishActiveScene: true })

      expect(result).toEqual({ kind: 'keeper', ...keeperScene })
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('/api/campaigns/c1/scenes/s1/start')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({ presentInvestigatorIds: ['i1'], finishActiveScene: true })
    })

    it('maps 409 "Only a Prepared Scene can be started." to SceneNotPreparedError', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { title: 'Only a Prepared Scene can be started.' }))

      await expect(startScene('token', 'c1', 's1', { presentInvestigatorIds: ['i1'], finishActiveScene: false })).rejects.toBeInstanceOf(SceneNotPreparedError)
    })

    it('maps any other 409 to AnotherSceneActiveError', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { title: 'Another Scene is Active.' }))

      await expect(startScene('token', 'c1', 's1', { presentInvestigatorIds: ['i1'], finishActiveScene: false })).rejects.toBeInstanceOf(AnotherSceneActiveError)
    })

    it('maps 400 to InvestigatorsRefusedError', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { presentInvestigatorIds: ['Choose at least one Investigator present.'] } }))

      await expect(startScene('token', 'c1', 's1', { presentInvestigatorIds: [], finishActiveScene: false })).rejects.toBeInstanceOf(InvestigatorsRefusedError)
    })

    it('fails with the status on anything else, including 404', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))

      await expect(startScene('token', 'c1', 's1', { presentInvestigatorIds: ['i1'], finishActiveScene: false })).rejects.toThrow('Failed to start the Scene (404)')
    })
  })

  describe('finishActiveScene', () => {
    it('posts to the finish route', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204))

      await finishActiveScene('token', 'c1')

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect([url, init.method]).toEqual(['/api/campaigns/c1/active-scene/finish', 'POST'])
    })

    it('maps 409 to NoActiveSceneError', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { title: 'No Scene is Active.' }))

      await expect(finishActiveScene('token', 'c1')).rejects.toBeInstanceOf(NoActiveSceneError)
    })

    it('fails with the status on anything else', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(500))

      await expect(finishActiveScene('token', 'c1')).rejects.toThrow('Failed to finish the Scene (500)')
    })
  })

  describe('changeInvestigatorsPresent', () => {
    it('puts the new list and returns the Keeper view', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, keeperScene))

      const result = await changeInvestigatorsPresent('token', 'c1', ['i1'])

      expect(result.kind).toBe('keeper')
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect([url, init.method, JSON.parse(init.body as string)]).toEqual(['/api/campaigns/c1/active-scene/present-investigators', 'PUT', { presentInvestigatorIds: ['i1'] }])
    })

    it('maps 409 to NoActiveSceneError and 400 to InvestigatorsRefusedError', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { title: 'No Scene is Active.' }))
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { presentInvestigatorIds: ['x'] } }))

      await expect(changeInvestigatorsPresent('token', 'c1', ['i1'])).rejects.toBeInstanceOf(NoActiveSceneError)
      await expect(changeInvestigatorsPresent('token', 'c1', [])).rejects.toBeInstanceOf(InvestigatorsRefusedError)
    })
  })

  it('keys the Active Scene by Campaign', () => {
    expect(activeSceneQueryKeys.detail('c1')).toEqual(['campaigns', 'c1', 'active-scene'])
  })
})
