import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemLinkNotFoundError, ItemLinkValidationError, linkItem, unlinkItem } from './itemLinkApi'
import { SceneFinishedError } from './sceneApi'

// specs/scenario-preparation/spec.md (Scene API, item-links) and the design record PBI-SP-008, D4.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const link = { id: 'l1', item: { id: 'k1', name: "Walter Corbitt's diary" } }
const baseUrl = '/api/campaigns/c1/scenarios/s1/scenes/a1/item-links'

describe('Item link API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  describe('linkItem', () => {
    it('posts the Item id with the token and returns the new link', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, link))

      expect(await linkItem('token', 'c1', 's1', 'a1', 'k1')).toEqual(link)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(baseUrl)
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer token' }))
      expect(JSON.parse(String(init?.body))).toEqual({ itemId: 'k1' })
    })

    it('counts an Item that was already linked (200 with the existing link) as success', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, link))

      expect(await linkItem('token', 'c1', 's1', 'a1', 'k1')).toEqual(link)
    })

    it('rejects a link with a field beyond the Item reference', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, { ...link, playerFacingName: 'A diary' }))

      await expect(linkItem('token', 'c1', 's1', 'a1', 'k1')).rejects.toThrow()
    })

    it('maps a 400 keyed itemId to the server message, whatever its casing', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { errors: { ItemId: ['Choose an Item of this Campaign.'] } }))

      const refused = await linkItem('token', 'c1', 's1', 'a1', 'k1').catch((error: unknown) => error)

      expect(refused).toBeInstanceOf(ItemLinkValidationError)
      expect((refused as ItemLinkValidationError).itemMessage).toBe('Choose an Item of this Campaign.')
    })

    it('maps a 400 without a message for the Item to a validation error without a message', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400, { errors: {} }))

      const refused = await linkItem('token', 'c1', 's1', 'a1', 'k1').catch((error: unknown) => error)

      expect((refused as ItemLinkValidationError).itemMessage).toBeUndefined()
    })

    it('maps a 409 to a finished Scene, a 404 to not found, and any other status to a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(linkItem('token', 'c1', 's1', 'a1', 'k1')).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(linkItem('token', 'c1', 's1', 'a1', 'k1')).rejects.toBeInstanceOf(ItemLinkNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(linkItem('token', 'c1', 's1', 'a1', 'k1')).rejects.toThrow('Failed to link the Item (500)')
    })
  })

  describe('unlinkItem', () => {
    it('deletes the link with the token', async () => {
      fetchMock.mockResolvedValue(jsonResponse(204))

      await unlinkItem('token', 'c1', 's1', 'a1', 'l1')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${baseUrl}/l1`)
      expect(init?.method).toBe('DELETE')
    })

    it('counts a link that is already gone as unlinked', async () => {
      fetchMock.mockResolvedValue(jsonResponse(404))

      await expect(unlinkItem('token', 'c1', 's1', 'a1', 'l1')).resolves.toBeUndefined()
    })

    it('maps a 409 to a finished Scene and any other status to a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(unlinkItem('token', 'c1', 's1', 'a1', 'l1')).rejects.toBeInstanceOf(SceneFinishedError)

      fetchMock.mockResolvedValueOnce(jsonResponse(500))
      await expect(unlinkItem('token', 'c1', 's1', 'a1', 'l1')).rejects.toThrow('Failed to unlink the Item (500)')
    })
  })
})
