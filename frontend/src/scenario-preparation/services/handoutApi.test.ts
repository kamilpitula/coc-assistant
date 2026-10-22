import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import {
  createHandout,
  deleteHandout,
  editHandout,
  getHandout,
  HandoutNotDeletableError,
  HandoutNotFoundError,
  handoutQueryKeys,
  HandoutValidationError,
  reorderHandouts,
  StaleHandoutOrderError,
} from './handoutApi'
import { SceneFinishedError } from './sceneApi'

// specs/scenario-preparation/spec.md (Scene API, Handouts) and the design record: .../scenes/{a}/handouts[/{handoutId}].
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const content: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
const handout = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door', content }
const input = { kind: 'ReadAloud' as const, visibility: 'PlayerFacing' as const, title: 'The front door', content }
const baseUrl = '/api/campaigns/c1/scenarios/s1/scenes/a1/handouts'

describe('Handout API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('keys a Handout under its Scene, so invalidating the Scene also reaches its Handouts', () => {
    expect(handoutQueryKeys.detail('c1', 's1', 'a1', 'h1')).toEqual(['campaigns', 'c1', 'scenarios', 's1', 'scenes', 'a1', 'handouts', 'h1'])
  })

  describe('getHandout', () => {
    it('returns the Handout with its content', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, handout))

      expect(await getHandout('token', 'c1', 's1', 'a1', 'h1')).toEqual(handout)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/h1`)
      expect(init?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer token' }))
    })

    it('returns null on 404 and rejects a field beyond the contract, such as a position', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      expect(await getHandout('token', 'c1', 's1', 'a1', 'h1')).toBeNull()

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...handout, position: 2 }))
      await expect(getHandout('token', 'c1', 's1', 'a1', 'h1')).rejects.toThrow()

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...handout, kind: 'Image' }))
      await expect(getHandout('token', 'c1', 's1', 'a1', 'h1')).rejects.toThrow()
    })

    it('fails on any other status', async () => {
      fetchMock.mockResolvedValue(jsonResponse(500))

      await expect(getHandout('token', 'c1', 's1', 'a1', 'h1')).rejects.toThrow('Failed to load the Handout (500)')
    })
  })

  describe('createHandout', () => {
    it('posts the kind, visibility, title, and content and returns the Handout', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, handout))

      expect(await createHandout('token', 'c1', 's1', 'a1', input)).toEqual(handout)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(baseUrl)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual(input)
    })

    it('maps a 400 by request path to the server message of each field, a 409 to finished, and a 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, {
          errors: {
            title: ['Enter a title.'],
            Kind: ['Choose Read-aloud or Text.'],
            visibility: ['Choose who can see this Handout.'],
            content: ["This text can't be saved. Shorten it or remove unsupported content."],
            unknown: ['ignored'],
          },
        }),
      )
      const refused = await createHandout('token', 'c1', 's1', 'a1', input).catch((error: unknown) => error)
      expect(refused).toBeInstanceOf(HandoutValidationError)
      expect((refused as HandoutValidationError).fieldErrors).toEqual({
        title: 'Enter a title.',
        kind: 'Choose Read-aloud or Text.',
        visibility: 'Choose who can see this Handout.',
        content: "This text can't be saved. Shorten it or remove unsupported content.",
      })

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(createHandout('token', 'c1', 's1', 'a1', input)).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(createHandout('token', 'c1', 's1', 'a1', input)).rejects.toBeInstanceOf(HandoutNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(createHandout('token', 'c1', 's1', 'a1', input)).rejects.toThrow('Failed to create the Handout (500)')
    })
  })

  describe('editHandout', () => {
    it('puts the same fields to the Handout and returns it', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ...handout, kind: 'Text' }))

      const saved = await editHandout('token', 'c1', 's1', 'a1', 'h1', { ...input, kind: 'Text' })

      expect(saved.kind).toBe('Text')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/h1`)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({ ...input, kind: 'Text' })
    })

    it('maps 400, 404, and 409 like a create', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { title: ['Enter a title.'] } }))
      await expect(editHandout('token', 'c1', 's1', 'a1', 'h1', input)).rejects.toBeInstanceOf(HandoutValidationError)
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(editHandout('token', 'c1', 's1', 'a1', 'h1', input)).rejects.toBeInstanceOf(HandoutNotFoundError)
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(editHandout('token', 'c1', 's1', 'a1', 'h1', input)).rejects.toBeInstanceOf(SceneFinishedError)
    })
  })

  describe('deleteHandout', () => {
    it('deletes the Handout, and a Handout that is already gone (404) counts as deleted', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204))
      await expect(deleteHandout('token', 'c1', 's1', 'a1', 'h1')).resolves.toBeUndefined()
      expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
      expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/h1`)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(deleteHandout('token', 'c1', 's1', 'a1', 'h1')).resolves.toBeUndefined()
    })

    it('maps a 409 to not deletable, which covers Active and Finished Scenes, and fails on other statuses', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(deleteHandout('token', 'c1', 's1', 'a1', 'h1')).rejects.toBeInstanceOf(HandoutNotDeletableError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(deleteHandout('token', 'c1', 's1', 'a1', 'h1')).rejects.toThrow('Failed to delete the Handout (500)')
    })
  })

  describe('reorderHandouts', () => {
    const summaries = [
      { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: 'Second' },
      { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'First' },
    ]

    it('puts every Handout id and returns the Handouts in the new order', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { handouts: summaries }))

      expect(await reorderHandouts('token', 'c1', 's1', 'a1', ['h2', 'h1'])).toEqual(summaries)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/order`)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({ handoutIds: ['h2', 'h1'] })
    })

    it('maps a 409 to a stale order and a 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(reorderHandouts('token', 'c1', 's1', 'a1', ['h1'])).rejects.toBeInstanceOf(StaleHandoutOrderError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(reorderHandouts('token', 'c1', 's1', 'a1', ['h1'])).rejects.toBeInstanceOf(HandoutNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(reorderHandouts('token', 'c1', 's1', 'a1', ['h1'])).rejects.toThrow('Failed to change the Handout order (500)')
    })
  })
})
