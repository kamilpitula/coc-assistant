import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { campaignQueryKeys, getCampaignMembers } from './campaignApi'

// specs/campaign-play/spec.md, Campaign members API: GET /api/campaigns/{campaignId}/members.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getCampaignMembers', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('returns the roster in the order the server sends it', async () => {
    const roster = [
      { memberId: 'c1', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false },
      { memberId: 'p1', displayName: 'Sam Okafor', role: 'Player', isYou: true },
    ]
    fetchMock.mockResolvedValue(jsonResponse(200, roster))

    const members = await getCampaignMembers('token', 'c1')

    expect(members).toEqual(roster)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/campaigns/c1/members',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    )
  })

  it('returns null for someone who is not a Campaign Member (404)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404))

    expect(await getCampaignMembers('token', 'c1')).toBeNull()
  })

  it('throws on any other failure so the section can offer to try again', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500))

    await expect(getCampaignMembers('token', 'c1')).rejects.toThrow()
  })

  it('keys the roster under the Campaign so a reconnect refetches it with every Campaign query', () => {
    expect(campaignQueryKeys.members('c1')).toEqual(['campaigns', 'c1', 'members'])
  })
})
