import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import {
  createItem,
  deleteItem,
  editItem,
  getItem,
  getItems,
  ItemNotDeletableError,
  ItemNotFoundError,
  itemQueryKeys,
  ItemValidationError,
} from './itemApi'

// specs/scenario-preparation/spec.md (Item API) and the design record PBI-SP-008: /api/campaigns/{c}/items[/{itemId}].
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const description: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
const scene = { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status: 'Prepared' }
const handout = { id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }
const item = {
  id: 'k1',
  name: "Walter Corbitt's diary",
  playerFacingDescription: description,
  keeperNotes: null,
  holder: null,
  handouts: [handout],
  scenes: [scene],
}
const input = { name: "Walter Corbitt's diary", playerFacingDescription: description, keeperNotes: null }
const baseUrl = '/api/campaigns/c1/items'

describe('Item API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('keys an Item under its Campaign, so invalidating the Items reaches the list and every Item', () => {
    expect(itemQueryKeys.list('c1')).toEqual(['campaigns', 'c1', 'items', 'list'])
    expect(itemQueryKeys.detail('c1', 'k1')).toEqual(['campaigns', 'c1', 'items', 'k1'])
    expect(itemQueryKeys.all('c1')).toEqual(['campaigns', 'c1', 'items'])
  })

  describe('getItems', () => {
    it('returns each Item with its name and Scene count, with the token', async () => {
      const items = [{ id: 'k1', name: 'The cellar key', sceneCount: 0 }]
      fetchMock.mockResolvedValue(jsonResponse(200, { items }))

      expect(await getItems('token', 'c1')).toEqual(items)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(baseUrl)
      expect(init?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer token' }))
    })

    it('rejects a field beyond the contract and a negative count', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [{ id: 'k1', name: 'Key', sceneCount: 0, position: 1 }] }))
      await expect(getItems('token', 'c1')).rejects.toThrow()

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [{ id: 'k1', name: 'Key', sceneCount: -1 }] }))
      await expect(getItems('token', 'c1')).rejects.toThrow()
    })

    it('throws not found on 404 and fails on any other status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(getItems('token', 'c1')).rejects.toBeInstanceOf(ItemNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(getItems('token', 'c1')).rejects.toThrow('Failed to load the Items (500)')
    })
  })

  describe('getItem', () => {
    it('returns the Item with its Handouts and Scenes', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, item))

      expect(await getItem('token', 'c1', 'k1')).toEqual(item)
      expect(fetchMock.mock.calls[0][0]).toBe(`${baseUrl}/k1`)
    })

    it('returns null on 404 and fails on any other status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      expect(await getItem('token', 'c1', 'k1')).toBeNull()

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(getItem('token', 'c1', 'k1')).rejects.toThrow('Failed to load the Item (500)')
    })

    it('rejects a field beyond the contract, a Scene without its Scenario, a holder, and a Handout with content', async () => {
      for (const body of [
        { ...item, position: 1 },
        { ...item, scenes: [{ ...scene, scenarioTitle: undefined }] },
        { ...item, scenes: [{ ...scene, position: 2 }] },
        { ...item, scenes: [{ ...scene, status: 'Done' }] },
        { ...item, holder: { investigatorId: 'i1' } },
        { ...item, handouts: [{ ...handout, content: description }] },
        { ...item, playerFacingDescription: null },
      ]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, body))
        await expect(getItem('token', 'c1', 'k1')).rejects.toThrow()
      }
    })

    it('keeps unknown properties inside the rich text', async () => {
      const loose = { root: { type: 'root', children: [], extra: 1 }, extra: 2 }
      fetchMock.mockResolvedValue(jsonResponse(200, { ...item, playerFacingDescription: loose, keeperNotes: loose }))

      const loaded = await getItem('token', 'c1', 'k1')

      expect(loaded?.playerFacingDescription).toEqual(loose)
      expect(loaded?.keeperNotes).toEqual(loose)
    })
  })

  describe('createItem', () => {
    it('posts the name, description, and notes and returns the Item', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, item))

      expect(await createItem('token', 'c1', input)).toEqual(item)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(baseUrl)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual(input)
    })

    it('maps a 400 by request path, in any casing, to the server message of each field', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, {
          errors: {
            Name: ['Enter a name.'],
            playerFacingDescription: ['Enter a Player-facing description.'],
            keeperNotes: ['The Keeper notes must use only the allowed rich-text nodes.'],
            unknown: ['ignored'],
          },
        }),
      )

      const refused = await createItem('token', 'c1', input).catch((error: unknown) => error)

      expect(refused).toBeInstanceOf(ItemValidationError)
      expect((refused as ItemValidationError).fieldErrors).toEqual({
        name: 'Enter a name.',
        playerFacingDescription: 'Enter a Player-facing description.',
        keeperNotes: 'The Keeper notes must use only the allowed rich-text nodes.',
      })
    })

    it('throws not found on 404 and fails on any other status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(createItem('token', 'c1', input)).rejects.toBeInstanceOf(ItemNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(createItem('token', 'c1', input)).rejects.toThrow('Failed to create the Item (500)')
    })
  })

  describe('editItem', () => {
    it('puts the whole Item and returns the saved one', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ...item, name: 'The diary' }))

      expect((await editItem('token', 'c1', 'k1', input)).name).toBe('The diary')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/k1`)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual(input)
    })

    it('maps a 400 to field errors, a 404 to not found, and any other status to a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { name: ['Name must be 200 characters or fewer.'] } }))
      const refused = await editItem('token', 'c1', 'k1', input).catch((error: unknown) => error)
      expect((refused as ItemValidationError).fieldErrors).toEqual({ name: 'Name must be 200 characters or fewer.' })

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(editItem('token', 'c1', 'k1', input)).rejects.toBeInstanceOf(ItemNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(editItem('token', 'c1', 'k1', input)).rejects.toThrow('Failed to save the Item (500)')
    })
  })

  describe('deleteItem', () => {
    it('deletes with the token', async () => {
      fetchMock.mockResolvedValue(jsonResponse(204))

      await deleteItem('token', 'c1', 'k1')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/k1`)
      expect(init?.method).toBe('DELETE')
    })

    it('counts an Item that is already gone as deleted', async () => {
      fetchMock.mockResolvedValue(jsonResponse(404))

      await expect(deleteItem('token', 'c1', 'k1')).resolves.toBeUndefined()
    })

    it('reads a 409 for a played Scene as the played reason', async () => {
      fetchMock.mockResolvedValue(jsonResponse(409, { title: "An Item linked to an Active or Finished Scene can't be deleted." }))

      const refused = await deleteItem('token', 'c1', 'k1').catch((error: unknown) => error)

      expect(refused).toBeInstanceOf(ItemNotDeletableError)
      expect((refused as ItemNotDeletableError).reason).toBe('played')
    })

    it('reads a 409 for a held Item as the held reason', async () => {
      fetchMock.mockResolvedValue(jsonResponse(409, { title: "An Item held by an Investigator can't be deleted." }))

      const refused = await deleteItem('token', 'c1', 'k1').catch((error: unknown) => error)

      expect((refused as ItemNotDeletableError).reason).toBe('held')
    })

    it('reads a 409 without a known title as the played reason', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 409 }))

      const refused = await deleteItem('token', 'c1', 'k1').catch((error: unknown) => error)

      expect((refused as ItemNotDeletableError).reason).toBe('played')
    })

    it('fails on any other status', async () => {
      fetchMock.mockResolvedValue(jsonResponse(500))

      await expect(deleteItem('token', 'c1', 'k1')).rejects.toThrow('Failed to delete the Item (500)')
    })
  })
})
