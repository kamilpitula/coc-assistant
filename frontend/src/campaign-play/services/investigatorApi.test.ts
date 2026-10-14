import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EMPTY_BACKSTORY } from '@/campaign-play/state/characterSheetForm'
import { rules, sheetView } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import {
  approveInvestigator,
  createInvestigator,
  deleteMyInvestigator,
  getInvestigatorForKeeper,
  getMyCharacterSheet,
  getMyInvestigator,
  InvestigatorConflictError,
  requestChanges,
  saveMyCharacterSheet,
  submitMyInvestigator,
} from './investigatorApi'

const summary = {
  id: 'i1',
  status: 'Draft',
  name: null,
  changeRequestComment: null,
  updatedAt: '2026-10-02T12:00:00+00:00',
}

const characterSheet = sheetView()

const nameError = {
  code: 'InvestigatorNameRequired',
  field: 'identity.name',
  message: "Enter your Investigator's name.",
  expected: null,
  actual: null,
  severity: 'Error',
}

const myCharacterSheet = {
  investigatorId: 'i1',
  status: 'Draft',
  playerName: 'Ada Lovelace',
  changeRequestComment: null,
  characterSheet,
  rules,
  validationErrors: [nameError],
}

const keeperInvestigator = {
  id: 'i1',
  status: 'Submitted',
  playerName: 'Ada Lovelace',
  changeRequestComment: null,
  updatedAt: '2026-10-02T12:00:00+00:00',
  characterSheet,
  warnings: [],
}

const inputs: CharacterSheetInputs = {
  identity: { name: 'Harvey Walters', age: 25, gender: null, residence: null, birthplace: null },
  creationMethod: 'PointBuy',
  characteristics: { STR: 60 },
  characteristicRolls: {},
  ageEffects: { deductions: {}, eduImprovementChecks: [{ check: 30, gain: null }] },
  luckRolls: [11],
  occupation: null,
  skills: [],
  quickFire: { values: [], personalInterests: [] },
  backstory: EMPTY_BACKSTORY,
  keyConnection: null,
  weapons: [],
  gear: null,
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** specs/campaign-play/spec.md Investigator API shapes and specs/character-sheet/spec.md API Contracts. */
describe('investigatorApi', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it("creates the Player's Draft with a POST and returns its summary", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, summary))

    expect(await createInvestigator('token', 'c1')).toEqual(summary)
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/investigators', expect.objectContaining({ method: 'POST' }))
  })

  it('throws a conflict error when creation is refused with 409', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { title: 'Conflict', status: 409 }))

    await expect(createInvestigator('token', 'c1')).rejects.toBeInstanceOf(InvestigatorConflictError)
  })

  it("returns the Player's Investigator summary, or null when there is none (404)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, summary)).mockResolvedValueOnce(jsonResponse(404))

    expect(await getMyInvestigator('token', 'c1')).toEqual(summary)
    expect(await getMyInvestigator('token', 'c1')).toBeNull()
  })

  it('deletes the Draft with a DELETE', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await deleteMyInvestigator('token', 'c1')

    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/investigators/mine', expect.objectContaining({ method: 'DELETE' }))
  })

  it('returns the submitted Investigator, or the validation errors of a 422', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { ...summary, status: 'Submitted' }))
      .mockResolvedValueOnce(jsonResponse(422, { title: 'Invalid', status: 422, validationErrors: [nameError] }))

    expect(await submitMyInvestigator('token', 'c1')).toEqual({
      kind: 'submitted',
      investigator: { ...summary, status: 'Submitted' },
    })
    expect(await submitMyInvestigator('token', 'c1')).toEqual({ kind: 'invalid', validationErrors: [nameError] })
  })

  it('reads the Character Sheet with its rules and problems, or null when there is none', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, myCharacterSheet)).mockResolvedValueOnce(jsonResponse(404))

    expect(await getMyCharacterSheet('token', 'c1')).toEqual(myCharacterSheet)
    expect(await getMyCharacterSheet('token', 'c1')).toBeNull()
  })

  it('saves the Character Sheet inputs with a PUT and returns the recomputed sheet', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, myCharacterSheet))

    expect(await saveMyCharacterSheet('token', 'c1', inputs)).toEqual(myCharacterSheet)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/campaigns/c1/investigators/mine/character-sheet')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(init?.body as string)).toEqual(inputs)
  })

  it('throws a conflict error when the sheet can no longer be edited (409)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { status: 409 }))

    await expect(saveMyCharacterSheet('token', 'c1', inputs)).rejects.toBeInstanceOf(InvestigatorConflictError)
  })

  it('reads an Investigator for the Keeper, or null outside their visibility', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, keeperInvestigator)).mockResolvedValueOnce(jsonResponse(404))

    expect(await getInvestigatorForKeeper('token', 'c1', 'i1')).toEqual(keeperInvestigator)
    expect(await getInvestigatorForKeeper('token', 'c1', 'i1')).toBeNull()
  })

  it('approves with a POST and returns the updated Investigator', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ...keeperInvestigator, status: 'Approved' }))

    expect((await approveInvestigator('token', 'c1', 'i1')).status).toBe('Approved')
    expect(fetchMock).toHaveBeenCalledWith('/api/campaigns/c1/investigators/i1/approve', expect.objectContaining({ method: 'POST' }))
  })

  it('requests changes with the comment, and reports a status conflict as a conflict error', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { ...keeperInvestigator, status: 'ChangesRequested' }))
      .mockResolvedValueOnce(jsonResponse(409, { status: 409 }))

    expect((await requestChanges('token', 'c1', 'i1', 'Lower the Credit Rating')).status).toBe('ChangesRequested')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ comment: 'Lower the Credit Rating' })
    await expect(requestChanges('token', 'c1', 'i1', 'Again')).rejects.toBeInstanceOf(InvestigatorConflictError)
  })

  it('throws on other failures', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500))

    await expect(getMyInvestigator('token', 'c1')).rejects.toThrow(/500/)
  })
})
