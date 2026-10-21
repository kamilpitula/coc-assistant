import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import {
  editNonPlayerEntityLink,
  linkNonPlayerEntity,
  NonPlayerEntityLinkNotFoundError,
  NonPlayerEntityLinkValidationError,
  unlinkNonPlayerEntity,
} from './nonPlayerEntityLinkApi'
import { SceneFinishedError } from './sceneApi'

// specs/scenario-preparation/spec.md (Scene API) and the design record D4/D7:
// /api/campaigns/{c}/scenarios/{s}/scenes/{a}/non-player-entity-links[/{linkId}].
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const description: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
const link = {
  id: 'l1',
  nonPlayerEntity: { id: 'm1', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: description,
}
const baseUrl = '/api/campaigns/c1/scenarios/s1/scenes/a1/non-player-entity-links'

describe('Non-Player Entity link API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  describe('linkNonPlayerEntity', () => {
    it('posts the reference, the Player-facing name, and the description, and returns the link', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, link))

      const created = await linkNonPlayerEntity('token', 'c1', 's1', 'a1', {
        nonPlayerEntity: { type: 'MythosCreature', id: 'm1' },
        playerFacingName: 'A shape in the cellar',
        playerFacingDescription: description,
      })

      expect(created).toEqual(link)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(baseUrl)
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer token' }))
      expect(JSON.parse(String(init?.body))).toEqual({
        nonPlayerEntity: { type: 'MythosCreature', id: 'm1' },
        playerFacingName: 'A shape in the cellar',
        playerFacingDescription: description,
      })
    })

    it('sends a null description when there is none', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, { ...link, playerFacingDescription: null }))

      await linkNonPlayerEntity('token', 'c1', 's1', 'a1', {
        nonPlayerEntity: { type: 'HumanNpc', id: 'h1' },
        playerFacingName: 'The landlord',
        playerFacingDescription: null,
      })

      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).playerFacingDescription).toBeNull()
    })

    it('maps a 400 by request path to the field messages of the server, 409 to finished, and 404 to not found', async () => {
      const input = { nonPlayerEntity: { type: 'HumanNpc' as const, id: 'h1' }, playerFacingName: '', playerFacingDescription: null }
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, {
          errors: {
            nonPlayerEntity: ['Choose a Non-Player Entity from this Campaign.'],
            playerFacingName: ['Enter a Player-facing name.'],
            playerFacingDescription: ["This Player-facing description can't be saved. Shorten it or remove unsupported content."],
          },
        }),
      )
      const refused = await linkNonPlayerEntity('token', 'c1', 's1', 'a1', input).catch((error: unknown) => error)
      expect(refused).toBeInstanceOf(NonPlayerEntityLinkValidationError)
      expect((refused as NonPlayerEntityLinkValidationError).fieldErrors).toEqual({
        nonPlayerEntity: 'Choose a Non-Player Entity from this Campaign.',
        playerFacingName: 'Enter a Player-facing name.',
        playerFacingDescription: "This Player-facing description can't be saved. Shorten it or remove unsupported content.",
      })

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(linkNonPlayerEntity('token', 'c1', 's1', 'a1', input)).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(linkNonPlayerEntity('token', 'c1', 's1', 'a1', input)).rejects.toBeInstanceOf(NonPlayerEntityLinkNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(linkNonPlayerEntity('token', 'c1', 's1', 'a1', input)).rejects.toThrow('Failed to link the Non-Player Entity (500)')
    })

    it('rejects an answer with a field beyond the contract', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, { ...link, position: 1 }))

      await expect(
        linkNonPlayerEntity('token', 'c1', 's1', 'a1', { nonPlayerEntity: { type: 'HumanNpc', id: 'h1' }, playerFacingName: 'x', playerFacingDescription: null }),
      ).rejects.toThrow()
    })
  })

  describe('editNonPlayerEntityLink', () => {
    it('puts only the Player-facing fields to the link and returns the link', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, link))

      const saved = await editNonPlayerEntityLink('token', 'c1', 's1', 'a1', 'l1', { playerFacingName: 'Renamed', playerFacingDescription: null })

      expect(saved).toEqual(link)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/l1`)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({ playerFacingName: 'Renamed', playerFacingDescription: null })
    })

    it('maps 400, 409, and 404 like linking', async () => {
      const input = { playerFacingName: '', playerFacingDescription: null }
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { playerFacingName: ['Enter a Player-facing name.'] } }))
      const refused = await editNonPlayerEntityLink('token', 'c1', 's1', 'a1', 'l1', input).catch((error: unknown) => error)
      expect((refused as NonPlayerEntityLinkValidationError).fieldErrors).toEqual({ playerFacingName: 'Enter a Player-facing name.' })

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(editNonPlayerEntityLink('token', 'c1', 's1', 'a1', 'l1', input)).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(editNonPlayerEntityLink('token', 'c1', 's1', 'a1', 'l1', input)).rejects.toBeInstanceOf(NonPlayerEntityLinkNotFoundError)
    })
  })

  describe('unlinkNonPlayerEntity', () => {
    it('deletes the link', async () => {
      fetchMock.mockResolvedValue(jsonResponse(204))

      await unlinkNonPlayerEntity('token', 'c1', 's1', 'a1', 'l1')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/l1`)
      expect(init?.method).toBe('DELETE')
    })

    it('counts 404 as success, maps 409 to finished, and other failures to an error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(unlinkNonPlayerEntity('token', 'c1', 's1', 'a1', 'l1')).resolves.toBeUndefined()

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(unlinkNonPlayerEntity('token', 'c1', 's1', 'a1', 'l1')).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(unlinkNonPlayerEntity('token', 'c1', 's1', 'a1', 'l1')).rejects.toThrow('Failed to unlink the Non-Player Entity (500)')
    })
  })
})
