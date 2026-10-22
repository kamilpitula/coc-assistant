import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import {
  createScene,
  editScene,
  getScene,
  getScenes,
  removeScene,
  reorderScenes,
  SceneFinishedError,
  SceneNotFoundError,
  SceneNotRemovableError,
  sceneQueryKeys,
  SceneValidationError,
  StaleSceneOrderError,
} from './sceneApi'

// specs/scenario-preparation/spec.md (Scene API) and the design record: /api/campaigns/{c}/scenarios/{s}/scenes.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const summary = { id: 'a1', title: 'Meeting Knott', status: 'Prepared', startedAt: null, finishedAt: null }
const notes: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
const link = {
  id: 'l1',
  nonPlayerEntity: { id: 'm1', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: notes,
}
const handoutSummary = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }
const detail = { ...summary, location: 'Arkham', keeperNotes: notes, nonPlayerEntityLinks: [link], handouts: [handoutSummary] }

describe('scene API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('keys the queries under the Scenario, so invalidating the Scenario also reaches its Scenes', () => {
    expect(sceneQueryKeys.list('c1', 's1')).toEqual(['campaigns', 'c1', 'scenarios', 's1', 'scenes', 'list'])
    expect(sceneQueryKeys.detail('c1', 's1', 'a1')).toEqual(['campaigns', 'c1', 'scenarios', 's1', 'scenes', 'a1'])
  })

  describe('getScenes', () => {
    it('returns the Scenes in the order the server sends them', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenes: [summary] }))

      expect(await getScenes('token', 'c1', 's1')).toEqual([summary])
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/c1/scenarios/s1/scenes',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
      )
    })

    it('rejects a Scene with a field beyond the contract, such as a position', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenes: [{ ...summary, position: 1 }] }))

      await expect(getScenes('token', 'c1', 's1')).rejects.toThrow()
    })

    it('rejects an unknown status', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenes: [{ ...summary, status: 'Archived' }] }))

      await expect(getScenes('token', 'c1', 's1')).rejects.toThrow()
    })

    it('throws SceneNotFoundError on 404 and a plain error on other failures', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(getScenes('token', 'c1', 's1')).rejects.toBeInstanceOf(SceneNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(getScenes('token', 'c1', 's1')).rejects.toThrow('Failed to load the Scenes (500)')
    })
  })

  describe('getScene', () => {
    it('returns the links in the order sent, each as a reference with the live profile name and its Player-facing text', async () => {
      const second = { ...link, id: 'l2', nonPlayerEntity: { id: 'h1', type: 'HumanNpc', name: 'Mr. Knott' }, playerFacingDescription: null }
      fetchMock.mockResolvedValue(jsonResponse(200, { ...detail, nonPlayerEntityLinks: [link, second] }))

      const scene = await getScene('token', 'c1', 's1', 'a1')

      expect(scene?.nonPlayerEntityLinks.map((entry) => [entry.id, entry.nonPlayerEntity.type, entry.nonPlayerEntity.name, entry.playerFacingName])).toEqual([
        ['l1', 'MythosCreature', 'Ghoul', 'A shape in the cellar'],
        ['l2', 'HumanNpc', 'Mr. Knott', 'A shape in the cellar'],
      ])
      expect(scene?.nonPlayerEntityLinks[1].playerFacingDescription).toBeNull()
    })

    it('rejects a link that carries profile data beyond the reference, an unknown type, or a Scene without links', async () => {
      const withProfile = { ...link, nonPlayerEntity: { ...link.nonPlayerEntity, profile: { age: 62 } } }
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...detail, nonPlayerEntityLinks: [withProfile] }))
      await expect(getScene('token', 'c1', 's1', 'a1')).rejects.toThrow()

      const unknownType = { ...link, nonPlayerEntity: { ...link.nonPlayerEntity, type: 'Item' } }
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...detail, nonPlayerEntityLinks: [unknownType] }))
      await expect(getScene('token', 'c1', 's1', 'a1')).rejects.toThrow()

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...summary, location: 'Arkham', keeperNotes: notes }))
      await expect(getScene('token', 'c1', 's1', 'a1')).rejects.toThrow()
    })

    it('returns the Scene with its location and rich-text notes, and keeps unknown properties inside the notes', async () => {
      const looseNotes = { root: { type: 'root', children: [], extra: 1 }, extra: 2 }
      fetchMock.mockResolvedValue(jsonResponse(200, { ...detail, keeperNotes: looseNotes }))

      expect(await getScene('token', 'c1', 's1', 'a1')).toEqual({ ...detail, keeperNotes: looseNotes })
    })

    it('returns the Handouts in the order sent, each with its kind, visibility, and title but no text', async () => {
      const second = { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: 'A letter' }
      fetchMock.mockResolvedValue(jsonResponse(200, { ...detail, handouts: [handoutSummary, second] }))

      const scene = await getScene('token', 'c1', 's1', 'a1')

      expect(scene?.handouts).toEqual([handoutSummary, second])
    })

    it('rejects a Handout with content or a position, an unknown kind or visibility, and a Scene without handouts', async () => {
      for (const handout of [
        { ...handoutSummary, content: notes },
        { ...handoutSummary, position: 1 },
        { ...handoutSummary, kind: 'Image' },
        { ...handoutSummary, visibility: 'Everyone' },
      ]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...detail, handouts: [handout] }))
        await expect(getScene('token', 'c1', 's1', 'a1')).rejects.toThrow()
      }

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...detail, handouts: undefined }))
      await expect(getScene('token', 'c1', 's1', 'a1')).rejects.toThrow()
    })

    it('accepts no notes', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ...detail, keeperNotes: null }))

      expect((await getScene('token', 'c1', 's1', 'a1'))?.keeperNotes).toBeNull()
    })

    it('rejects a field beyond the contract on the Scene itself', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ...detail, position: 3 }))

      await expect(getScene('token', 'c1', 's1', 'a1')).rejects.toThrow()
    })

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValue(jsonResponse(404))

      expect(await getScene('token', 'c1', 's1', 'a1')).toBeNull()
    })
  })

  describe('createScene and editScene', () => {
    const input = { title: 'T', location: '', keeperNotes: null }

    it('posts the title, a null location when empty, and the notes as a nested value', async () => {
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(201, detail)))

      await createScene('token', 'c1', 's1', { title: 'T', location: 'Arkham', keeperNotes: notes })
      await createScene('token', 'c1', 's1', input)

      const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string))
      expect(bodies).toEqual([
        { title: 'T', location: 'Arkham', keeperNotes: notes },
        { title: 'T', location: null, keeperNotes: null },
      ])
      expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    })

    it('puts to the Scene', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, detail))

      await editScene('token', 'c1', 's1', 'a1', input)

      expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/scenarios/s1/scenes/a1', expect.objectContaining({ method: 'PUT' }))
    })

    it('maps a 400 to field errors in any casing', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { errors: { Title: ['x'], location: ['y'], keeperNotes: ['z'] } }))

      const error = await createScene('token', 'c1', 's1', input).catch((reason: unknown) => reason)

      expect(error).toBeInstanceOf(SceneValidationError)
      expect((error as SceneValidationError).fieldErrors).toEqual({
        title: 'Enter a title.',
        location: 'Location must be 200 characters or fewer.',
        keeperNotes: "These Keeper notes can't be saved. Shorten them or remove unsupported content.",
      })
    })

    it('maps 404 to not found, 409 to finished, and other statuses to a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(editScene('token', 'c1', 's1', 'a1', input)).rejects.toBeInstanceOf(SceneNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(editScene('token', 'c1', 's1', 'a1', input)).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(editScene('token', 'c1', 's1', 'a1', input)).rejects.toThrow('Failed to save the Scene (500)')
    })
  })

  describe('removeScene', () => {
    it('deletes the Scene', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

      await removeScene('token', 'c1', 's1', 'a1')

      expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/scenarios/s1/scenes/a1', expect.objectContaining({ method: 'DELETE' }))
    })

    it('maps 409 to not removable and 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(removeScene('token', 'c1', 's1', 'a1')).rejects.toBeInstanceOf(SceneNotRemovableError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(removeScene('token', 'c1', 's1', 'a1')).rejects.toBeInstanceOf(SceneNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(removeScene('token', 'c1', 's1', 'a1')).rejects.toThrow('Failed to remove the Scene (500)')
    })
  })

  describe('reorderScenes', () => {
    it('sends every id and returns the Scenes in the new order', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { scenes: [summary] }))

      const scenes = await reorderScenes('token', 'c1', 's1', ['a1', 'a2'])

      expect(scenes).toEqual([summary])
      expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ sceneIds: ['a1', 'a2'] })
      expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/scenarios/s1/scenes/order')
    })

    it('maps 409 to a stale order and 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(reorderScenes('token', 'c1', 's1', [])).rejects.toBeInstanceOf(StaleSceneOrderError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(reorderScenes('token', 'c1', 's1', [])).rejects.toBeInstanceOf(SceneNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(reorderScenes('token', 'c1', 's1', [])).rejects.toThrow('Failed to change the Scene order (500)')
    })
  })
})
