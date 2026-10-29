import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cluesQueryKeys, getInvestigatorClues, getMyClues } from './cluesApi'
import {
  getRevealFile,
  RevealFileNotFoundError,
  RevealInvestigatorsRefusedError,
  revealQueryKeys,
  RevealSceneFinishedError,
  RevealSubjectRefusedError,
  revealToInvestigators,
} from './revealApi'

// specs/scene-play/spec.md (API Contracts: reveals, Reveal file, Clues) and PBI-SPL-002 design record D3, D5.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const keeperScene = {
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
  reveals: [],
}
const clue = {
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'Map',
  content: null,
  file: { name: 'cellar.png', mediaType: 'image/png', sizeBytes: 68 },
  imageDescription: 'A plan',
  scene: { id: 's1', title: 'The Corbitt House' },
}

describe('reveal API', () => {
  const fetchMock = vi.fn()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('revealToInvestigators', () => {
    const input = { subjectType: 'Handout' as const, subjectId: 'h1', investigatorIds: ['i1'] }

    it('posts the subject and the explicit Investigators with the token, and returns the Keeper view', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, keeperScene))

      const scene = await revealToInvestigators('token', 'c1', input)

      expect(scene.kind).toBe('keeper')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/campaigns/c1/active-scene/reveals')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(init?.body as string)).toEqual({ subject: { type: 'Handout', id: 'h1' }, investigatorIds: ['i1'] })
    })

    it('maps 409 to a finished Scene, a 400 at the subject to a subject refusal, and a 400 at investigatorIds to an Investigators refusal', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(revealToInvestigators('token', 'c1', input)).rejects.toBeInstanceOf(RevealSceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { 'subject.id': ['x'] } }))
      await expect(revealToInvestigators('token', 'c1', input)).rejects.toBeInstanceOf(RevealSubjectRefusedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { 'subject.type': ['x'] } }))
      await expect(revealToInvestigators('token', 'c1', input)).rejects.toBeInstanceOf(RevealSubjectRefusedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { investigatorIds: ['x'] } }))
      await expect(revealToInvestigators('token', 'c1', input)).rejects.toBeInstanceOf(RevealInvestigatorsRefusedError)
    })

    it('treats any other failure as a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503))

      await expect(revealToInvestigators('token', 'c1', input)).rejects.toThrow('Failed to reveal (503)')
    })
  })

  describe('getRevealFile', () => {
    it('reads the snapshotted bytes with the bearer token only', async () => {
      fetchMock.mockResolvedValueOnce(new Response('png', { status: 200 }))

      const blob = await getRevealFile('token', 'c1', 'r1')

      expect(await blob.text()).toBe('png')
      expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/reveals/r1/file', { headers: { Authorization: 'Bearer token' } })
    })

    it('maps 404 to not found and anything else to a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(getRevealFile('token', 'c1', 'r1')).rejects.toBeInstanceOf(RevealFileNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(503))
      await expect(getRevealFile('token', 'c1', 'r1')).rejects.toThrow('Failed to load the revealed file (503)')
    })

    it('keys a file outside the Active Scene keys, so a live refetch of the Scene never reloads a snapshot', () => {
      expect(revealQueryKeys.file('c1', 'r1')).toEqual(['campaigns', 'c1', 'reveals', 'r1', 'file'])
    })
  })

  describe('Clues', () => {
    it('reads the caller\'s own Clues and the Keeper\'s read of an Investigator', async () => {
      fetchMock.mockImplementation(async () => jsonResponse(200, { investigatorName: 'Harvey Walters', clues: [clue] }))

      expect((await getMyClues('token', 'c1'))?.clues).toHaveLength(1)
      expect((await getInvestigatorClues('token', 'c1', 'i1'))?.investigatorName).toBe('Harvey Walters')
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/campaigns/c1/investigators/mine/clues', '/api/campaigns/c1/investigators/i1/clues'])
    })

    it('resolves to null on 404 and fails on any other error status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      expect(await getMyClues('token', 'c1')).toBeNull()

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(getInvestigatorClues('token', 'c1', 'i1')).rejects.toThrow('Failed to load the Clues (500)')
    })

    it('rejects a Clue that names a subject id or recipients (PBI-SPL-002 D5)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { investigatorName: null, clues: [{ ...clue, subjectId: 'h1' }] }))

      await expect(getMyClues('token', 'c1')).rejects.toThrow()
    })

    it('keys the Keeper reads under one prefix and the own read apart from them', () => {
      expect(cluesQueryKeys.investigator('c1', 'i1').slice(0, 4)).toEqual(cluesQueryKeys.investigators('c1'))
      expect(cluesQueryKeys.mine('c1').slice(0, 4)).not.toEqual(cluesQueryKeys.investigators('c1'))
    })
  })
})
