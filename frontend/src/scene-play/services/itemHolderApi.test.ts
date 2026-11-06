import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import {
  getInvestigatorHeldItems,
  getMyHeldItems,
  GiveItemConflictError,
  GiveItemNotFoundError,
  GiveItemRefusedError,
  giveItem,
  heldItemsQueryKeys,
  TakeBackConflictError,
  TakeBackItemNotFoundError,
  takeBackItem,
} from './itemHolderApi'

// specs/scene-play/spec.md (API Contracts: give, take-back, mine/items) and section 22.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const description: RichTextDocument = { root: { type: 'root', children: [] } }

const giveReveal = {
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Item',
  title: "Walter Corbitt's diary",
  handoutKind: null,
  content: description,
  file: null,
  imageDescription: null,
  subjectId: 'k1',
  recipients: [{ id: 'i1', name: 'Harvey Walters' }],
}

const mine = {
  investigatorName: 'Harvey Walters',
  items: [{ revealId: 'r1', name: "Walter Corbitt's diary", description, givenAt: '2026-10-28T19:52:00Z' }],
}

describe('item holder API', () => {
  const fetchMock = vi.fn()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('keys held Items under the Campaign, so invalidating them reaches the mine and every Investigator read', () => {
    expect(heldItemsQueryKeys.mine('c1')).toEqual(['campaigns', 'c1', 'held-items', 'mine'])
    expect(heldItemsQueryKeys.investigator('c1', 'i1')).toEqual(['campaigns', 'c1', 'held-items', 'investigators', 'i1'])
    expect(heldItemsQueryKeys.all('c1')).toEqual(['campaigns', 'c1', 'held-items'])
  })

  describe('giveItem', () => {
    it('posts the Investigator with the token and returns the created give Reveal as the Keeper sees it', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, giveReveal))

      const reveal = await giveItem('token', 'c1', 'k1', 'i1')

      expect(reveal).toEqual({ ...giveReveal, content: description })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/campaigns/c1/items/k1/give')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(init?.body as string)).toEqual({ investigatorId: 'i1' })
    })

    it('rejects a Reveal without its recipients', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...giveReveal, recipients: undefined }))

      await expect(giveItem('token', 'c1', 'k1', 'i1')).rejects.toThrow()
    })

    it('maps 400 at itemId and investigatorId to a refusal naming the field, 409 to a conflict, and 404 to not found', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { itemId: ['This Item is not linked to the Active Scene.'] } }))
      const itemRefused = await giveItem('token', 'c1', 'k1', 'i1').catch((error: unknown) => error)
      expect(itemRefused).toBeInstanceOf(GiveItemRefusedError)
      expect((itemRefused as GiveItemRefusedError).field).toBe('itemId')

      fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { investigatorId: ['Only Investigators present can hold an Item.'] } }))
      const investigatorRefused = await giveItem('token', 'c1', 'k1', 'i2').catch((error: unknown) => error)
      expect(investigatorRefused).toBeInstanceOf(GiveItemRefusedError)
      expect((investigatorRefused as GiveItemRefusedError).field).toBe('investigatorId')

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(giveItem('token', 'c1', 'k1', 'i1')).rejects.toBeInstanceOf(GiveItemConflictError)

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(giveItem('token', 'c1', 'k1', 'i1')).rejects.toBeInstanceOf(GiveItemNotFoundError)
    })

    it('treats any other failure as a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503))

      await expect(giveItem('token', 'c1', 'k1', 'i1')).rejects.toThrow('Failed to give the Item (503)')
    })
  })

  describe('takeBackItem', () => {
    it('posts to take-back with the token and resolves on 204', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204))

      await takeBackItem('token', 'c1', 'k1')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/campaigns/c1/items/k1/take-back')
      expect(init?.method).toBe('POST')
    })

    it('maps 404 to not found and 409 to a conflict', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      await expect(takeBackItem('token', 'c1', 'k1')).rejects.toBeInstanceOf(TakeBackItemNotFoundError)

      fetchMock.mockResolvedValueOnce(jsonResponse(409))
      await expect(takeBackItem('token', 'c1', 'k1')).rejects.toBeInstanceOf(TakeBackConflictError)
    })

    it('treats any other failure as a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503))

      await expect(takeBackItem('token', 'c1', 'k1')).rejects.toThrow('Failed to take the Item back (503)')
    })
  })

  describe('held Items reads', () => {
    it("returns the caller's Investigator's Items, newest first", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, mine))

      expect(await getMyHeldItems('token', 'c1')).toEqual(mine)
      expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/investigators/mine/items')
    })

    it("returns an Investigator's Items with their ids for the Keeper", async () => {
      const keeper = { investigatorName: 'Harvey Walters', items: [{ itemId: 'k1', ...mine.items[0] }] }
      fetchMock.mockResolvedValueOnce(jsonResponse(200, keeper))

      expect(await getInvestigatorHeldItems('token', 'c1', 'i1')).toEqual(keeper)
      expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/investigators/i1/items')
    })

    it('resolves to null on 404 and rejects a Player read that names an Item id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      expect(await getMyHeldItems('token', 'c1')).toBeNull()

      fetchMock.mockResolvedValueOnce(jsonResponse(404))
      expect(await getInvestigatorHeldItems('token', 'c1', 'i1')).toBeNull()

      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...mine, items: [{ itemId: 'k1', ...mine.items[0] }] }))
      await expect(getMyHeldItems('token', 'c1')).rejects.toThrow()
    })

    it('treats any other failure as a plain error', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503))

      await expect(getMyHeldItems('token', 'c1')).rejects.toThrow('Failed to load the Items (503)')
    })
  })
})
