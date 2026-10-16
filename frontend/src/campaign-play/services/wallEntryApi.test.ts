import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { addWallEntry, getWallEntries, removeWallEntry } from './wallEntryApi'

// specs/campaign-play/spec.md, Wall Entry API: /api/campaigns/{campaignId}/wall-entries.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const entry = {
  id: 'e1',
  text: 'The lamp goes out.',
  visibility: 'Public',
  createdAt: '2026-10-16T19:02:00+00:00',
  authorDisplayName: 'Eleanor Hart',
}

describe('wall entry API', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  describe('getWallEntries', () => {
    it('requests the newest entries and returns the page the server sends', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { entries: [entry], nextCursor: 'abc' }))

      const page = await getWallEntries('token', 'c1', { limit: 5, cursor: 'xyz' })

      expect(page).toEqual({ entries: [entry], nextCursor: 'abc' })
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/c1/wall-entries?limit=5&cursor=xyz',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
      )
    })

    it('sends no query when no limit or cursor is given', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { entries: [], nextCursor: null }))

      await getWallEntries('token', 'c1')

      expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/wall-entries')
    })

    it('rejects an entry with a field beyond the contract so extra data is never passed on', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { entries: [{ ...entry, authorAccountId: 'a1' }], nextCursor: null }))

      await expect(getWallEntries('token', 'c1')).rejects.toThrow()
    })

    it('rejects a page with a field beyond the contract', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { entries: [], nextCursor: null, total: 3 }))

      await expect(getWallEntries('token', 'c1')).rejects.toThrow()
    })

    it('fails on a server error', async () => {
      fetchMock.mockResolvedValue(jsonResponse(500))

      await expect(getWallEntries('token', 'c1')).rejects.toThrow('Failed to load the Wall (500)')
    })
  })

  describe('addWallEntry', () => {
    it('posts the text and visibility and returns the created entry', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, { ...entry, visibility: 'KeeperOnly' }))

      const created = await addWallEntry('token', 'c1', { text: 'Secret.', visibility: 'KeeperOnly' })

      expect(created.visibility).toBe('KeeperOnly')
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/c1/wall-entries',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ text: 'Secret.', visibility: 'KeeperOnly' }) }),
      )
    })

    it('omits the visibility for a Player, who can only add Public entries', async () => {
      fetchMock.mockResolvedValue(jsonResponse(201, entry))

      await addWallEntry('token', 'c1', { text: 'I search the desk.' })

      expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ text: 'I search the desk.' }))
    })

    it('fails when the entry is refused', async () => {
      fetchMock.mockResolvedValue(jsonResponse(400))

      await expect(addWallEntry('token', 'c1', { text: 'x' })).rejects.toThrow('Failed to add the Wall Entry (400)')
    })
  })

  describe('removeWallEntry', () => {
    it('deletes the entry', async () => {
      fetchMock.mockResolvedValue(jsonResponse(204))

      await removeWallEntry('token', 'c1', 'e1')

      expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/wall-entries/e1', expect.objectContaining({ method: 'DELETE' }))
    })

    it('treats an entry that is already gone as removed', async () => {
      fetchMock.mockResolvedValue(jsonResponse(404))

      await expect(removeWallEntry('token', 'c1', 'e1')).resolves.toBeUndefined()
    })

    it('fails on a server error', async () => {
      fetchMock.mockResolvedValue(jsonResponse(500))

      await expect(removeWallEntry('token', 'c1', 'e1')).rejects.toThrow('Failed to remove the Wall Entry (500)')
    })
  })
})
