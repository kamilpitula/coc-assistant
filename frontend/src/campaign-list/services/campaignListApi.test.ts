import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'

import { campaignListQueryKeys, getCampaignList } from './campaignListApi'

// specs/campaign-list/spec.md, API: GET /api/campaigns, one flat array of per-role items.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const keeperItem = {
  id: 'c1',
  name: 'The Haunting',
  era: '1920s',
  role: 'Keeper',
  playerCount: 3,
  playerLimit: 8,
  approvedInvestigatorCount: 1,
  awaitingReviewCount: 2,
}

const playerItem = {
  id: 'c2',
  name: 'Horror on the Orient Express',
  era: '1920s',
  role: 'Player',
  keeperName: 'Anna K.',
  playerCount: 5,
  approvedInvestigatorCount: 4,
  myInvestigator: { status: 'ChangesRequested', name: null },
}

describe('getCampaignList', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('returns Keeper and Player items in the order the server sends them', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [keeperItem, playerItem, { ...playerItem, id: 'c3', myInvestigator: null }]))

    const items = await getCampaignList('token')

    expect(items.map((item) => item.id)).toEqual(['c1', 'c2', 'c3'])
    expect(items[1]).toEqual(playerItem)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    )
  })

  it('returns an empty list for an Account without Campaigns', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    expect(await getCampaignList('token')).toEqual([])
  })

  // Regression Guardrail: a Player item never carries the Player limit or the awaiting-review count.
  it.each([
    ['playerLimit', { ...playerItem, playerLimit: 8 }],
    ['awaitingReviewCount', { ...playerItem, awaitingReviewCount: 1 }],
  ])('rejects a Player item that carries %s', async (_property, item) => {
    fetchMock.mockResolvedValue(jsonResponse(200, [item]))

    await expect(getCampaignList('token')).rejects.toThrow()
  })

  it('rejects a Keeper item that carries an Account id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ ...keeperItem, keeperAccountId: 'a1' }]))

    await expect(getCampaignList('token')).rejects.toThrow()
  })

  it('throws when the list cannot be loaded', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500))

    await expect(getCampaignList('token')).rejects.toThrow('500')
  })
})

describe('campaignListQueryKeys', () => {
  it('shares the Campaign prefix, so creating a Campaign marks the list stale', () => {
    expect(campaignListQueryKeys.list.slice(0, campaignQueryKeys.all.length)).toEqual([...campaignQueryKeys.all])
    expect(campaignListQueryKeys.list).not.toEqual(campaignQueryKeys.all)
  })
})
