import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cluesQueryKeys, getInvestigatorClues, getMyClues } from './cluesApi'

// specs/scene-play/spec.md, API Contracts: GET investigators/mine/clues and GET investigators/{id}/clues.
function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const body = { investigatorName: null, clues: [] }

describe('Clues API', () => {
  const fetchMock = vi.fn()

  beforeEach(() => vi.stubGlobal('fetch', fetchMock))

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('reads the own Clues with the token, and a missing name stays null', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, body))

    expect(await getMyClues('token', 'c1')).toEqual(body)
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/investigators/mine/clues', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }))
  })

  it('reads an Investigator\'s Clues for the Keeper', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, body))

    await getInvestigatorClues('token', 'c1', 'i1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/campaigns/c1/investigators/i1/clues')
  })

  it('answers null for a 404 on either read', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404))

    expect(await getMyClues('token', 'c1')).toBeNull()
    expect(await getInvestigatorClues('token', 'c1', 'i1')).toBeNull()
  })

  it('fails on any other error status and on a body the contract does not name', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500))
    await expect(getMyClues('token', 'c1')).rejects.toThrow('Failed to load the Clues (500)')

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...body, extra: 1 }))
    await expect(getMyClues('token', 'c1')).rejects.toThrow()
  })

  it('keys every read under the Campaign, the Keeper reads under one prefix', () => {
    expect(cluesQueryKeys.all('c1')).toEqual(['campaigns', 'c1', 'clues'])
    expect(cluesQueryKeys.mine('c1')).toEqual([...cluesQueryKeys.all('c1'), 'mine'])
    expect(cluesQueryKeys.investigator('c1', 'i1')).toEqual([...cluesQueryKeys.investigators('c1'), 'i1'])
  })
})
