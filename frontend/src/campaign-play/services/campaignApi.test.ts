import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { changeAllowedCreationMethods, createCampaign, getCampaign } from './campaignApi'

const campaignBody = {
  id: 'c1',
  name: 'The Haunting',
  keeperAccountId: 'k1',
  playerLimit: 8,
  era: '1920s',
  allowedCreationMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
  role: 'Keeper',
}

const playerCampaignBody = {
  id: 'c1',
  name: 'The Haunting',
  era: '1920s',
  allowedCreationMethods: ['PointBuy'],
  role: 'Player',
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('campaignApi rules options', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('sends the Era and allowed Creation Methods when creating a Campaign', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, campaignBody))

    await createCampaign('token', {
      name: 'The Haunting',
      playerLimit: 8,
      era: '1920s',
      allowedCreationMethods: ['PointBuy'],
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init?.body as string)).toEqual({
      name: 'The Haunting',
      playerLimit: 8,
      era: '1920s',
      allowedCreationMethods: ['PointBuy'],
    })
  })

  it('returns the Campaign with its rules options for its Keeper', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, campaignBody))

    const campaign = await getCampaign('token', 'c1')

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1', expect.anything())
    expect(campaign).toEqual(campaignBody)
  })

  it("returns a Player's reduced Campaign view with the Player role", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, playerCampaignBody))

    expect(await getCampaign('token', 'c1')).toEqual(playerCampaignBody)
  })

  it('returns null when the caller is not a member of the Campaign (404)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404))

    expect(await getCampaign('token', 'c1')).toBeNull()
  })

  it('throws on other failures when loading a Campaign', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500))

    await expect(getCampaign('token', 'c1')).rejects.toThrow(/500/)
  })

  it('replaces the allowed Creation Methods with a PUT and returns the updated Campaign', async () => {
    const updated = { ...campaignBody, allowedCreationMethods: ['PointBuy'] }
    fetchMock.mockResolvedValue(jsonResponse(200, updated))

    const campaign = await changeAllowedCreationMethods('token', 'c1', ['PointBuy'])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/campaigns/c1/allowed-creation-methods')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(init?.body as string)).toEqual({ allowedCreationMethods: ['PointBuy'] })
    expect(campaign.allowedCreationMethods).toEqual(['PointBuy'])
  })

  it('throws when changing the allowed Creation Methods fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404))

    await expect(changeAllowedCreationMethods('token', 'c1', ['PointBuy'])).rejects.toThrow(/404/)
  })
})
