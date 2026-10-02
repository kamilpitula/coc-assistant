import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import {
  approveInvestigator,
  createInvestigator,
  deleteMyInvestigator,
  getInvestigatorForKeeper,
  getMyCharacterSheet,
  getMyInvestigator,
  InvestigatorConflictError,
  listInvestigators,
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

const characteristic = { assigned: 60, value: 60, hard: 30, extreme: 12 }

const characterSheet = {
  schemaVersion: 1,
  identity: { name: 'Harvey Walters', age: 25, gender: null, residence: null, birthplace: null },
  creationMethod: 'PointBuy',
  characteristics: {
    STR: characteristic,
    CON: characteristic,
    DEX: characteristic,
    APP: characteristic,
    POW: characteristic,
    SIZ: characteristic,
    INT: characteristic,
    EDU: characteristic,
  },
  ageEffects: {
    bracket: {
      minimumAge: 20,
      maximumAge: 39,
      physicalDeductionTotal: 0,
      physicalDeductionCharacteristics: [],
      appearanceModifier: 0,
      eduImprovementChecks: 1,
      luckRolls: 1,
    },
    deductions: {},
    eduImprovementChecks: [{ check: 30, gain: null, eduBefore: 50, eduAfter: 50 }],
  },
  luckRolls: [11],
  derived: {
    luck: 55,
    hitPoints: 12,
    magicPoints: 12,
    sanity: { current: 60, maximum: 99 },
    dodge: 30,
    movementRate: 8,
    damageBonus: '0',
    build: 0,
  },
  rollRecords: [{ purpose: 'Luck', dice: '3D6', result: 11, source: 'PlayerEntered' }],
}

const rules = {
  pointBuyBudget: 460,
  pointBuyMinimum: 15,
  pointBuyMaximum: 90,
  pointBuyRecommendedMinimum: 40,
  minimumAge: 15,
  maximumAge: 89,
  characteristicFloor: 0,
  luckDice: '3D6',
  eduImprovementCheckDice: 'D100',
  eduImprovementGainDice: '1D10',
}

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
  ageEffects: { deductions: {}, eduImprovementChecks: [{ check: 30, gain: null }] },
  luckRolls: [11],
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

  it("lists the Keeper's Investigators, or null for anyone else (404)", async () => {
    const row = {
      playerAccountId: 'p1',
      playerName: 'Ada Lovelace',
      status: 'Draft',
      investigatorId: null,
      investigatorName: null,
      updatedAt: '2026-10-02T12:00:00+00:00',
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [row])).mockResolvedValueOnce(jsonResponse(404))

    expect(await listInvestigators('token', 'c1')).toEqual([row])
    expect(await listInvestigators('token', 'c1')).toBeNull()
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
