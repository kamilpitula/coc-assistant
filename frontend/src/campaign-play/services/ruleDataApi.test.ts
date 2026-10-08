import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { occupationCatalog, skillCatalog } from '@/campaign-play/test-support/characterSheetFixtures'

import { getOccupationCatalog, getSkillCatalog } from './ruleDataApi'

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** specs/character-sheet/spec.md, API Contracts: the Era's rule data for Campaign members. */
describe('ruleDataApi', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('reads the Occupation catalog of the Campaign', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, occupationCatalog))

    await expect(getOccupationCatalog('token', 'c1')).resolves.toEqual(occupationCatalog)
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/rules/occupations', expect.objectContaining({ headers: expect.anything() }))
  })

  it('reads the skills of the Campaign', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, skillCatalog))

    await expect(getSkillCatalog('token', 'c1')).resolves.toEqual(skillCatalog)
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/rules/skills', expect.objectContaining({ headers: expect.anything() }))
  })

  it('fails when the rule data cannot be read', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404))

    await expect(getSkillCatalog('token', 'c1')).rejects.toThrow('404')
  })
})
