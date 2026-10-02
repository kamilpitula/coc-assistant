import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { creationMethodSchema } from '@/campaign-play/services/campaignApi'
import {
  CHARACTERISTIC_CODES,
  type CharacterSheetInputs,
} from '@/campaign-play/types/CharacterSheet'
import {
  INVESTIGATOR_STATUSES,
  type InvestigatorListItem,
  type InvestigatorSummary,
  type KeeperInvestigator,
  type MyCharacterSheet,
  type SubmitResult,
} from '@/campaign-play/types/Investigator'

/** The Investigator's status no longer allows the action, or a concurrent change won (409). */
export class InvestigatorConflictError extends Error {
  constructor() {
    super('The Investigator changed or already exists (409).')
    this.name = 'InvestigatorConflictError'
  }
}

const statusSchema = z.enum(INVESTIGATOR_STATUSES)
const characteristicCodeSchema = z.enum(CHARACTERISTIC_CODES)
const nullableNumber = z.number().int().nullable()

const summarySchema = z.object({
  id: z.string(),
  status: statusSchema,
  name: z.string().nullable(),
  changeRequestComment: z.string().nullable(),
  updatedAt: z.string(),
})

const listItemSchema = z.object({
  playerAccountId: z.string(),
  playerName: z.string().nullable(),
  status: statusSchema,
  investigatorId: z.string().nullable(),
  investigatorName: z.string().nullable(),
  updatedAt: z.string(),
})

export const validationErrorSchema = z.object({
  code: z.string(),
  field: z.string(),
  message: z.string(),
  expected: z.string().nullable(),
  actual: z.string().nullable(),
  severity: z.enum(['Error', 'Warning']),
})

const characteristicViewSchema = z.object({
  assigned: nullableNumber,
  value: nullableNumber,
  hard: nullableNumber,
  extreme: nullableNumber,
})

const characteristicInputsSchema = z.partialRecord(characteristicCodeSchema, nullableNumber)

const identitySchema = z.object({
  name: z.string().nullable(),
  age: nullableNumber,
  gender: z.string().nullable(),
  residence: z.string().nullable(),
  birthplace: z.string().nullable(),
})

const characterSheetViewSchema = z.object({
  schemaVersion: z.number().int(),
  identity: identitySchema,
  creationMethod: creationMethodSchema.nullable(),
  characteristics: z.record(characteristicCodeSchema, characteristicViewSchema),
  ageEffects: z.object({
    bracket: z
      .object({
        minimumAge: z.number().int(),
        maximumAge: z.number().int(),
        physicalDeductionTotal: z.number().int(),
        physicalDeductionCharacteristics: z.array(characteristicCodeSchema),
        appearanceModifier: z.number().int(),
        eduImprovementChecks: z.number().int(),
        luckRolls: z.number().int(),
      })
      .nullable(),
    deductions: characteristicInputsSchema,
    eduImprovementChecks: z.array(
      z.object({ check: nullableNumber, gain: nullableNumber, eduBefore: nullableNumber, eduAfter: nullableNumber }),
    ),
  }),
  luckRolls: z.array(nullableNumber),
  derived: z.object({
    luck: nullableNumber,
    hitPoints: nullableNumber,
    magicPoints: nullableNumber,
    sanity: z.object({ current: nullableNumber, maximum: nullableNumber }),
    dodge: nullableNumber,
    movementRate: nullableNumber,
    damageBonus: z.string().nullable(),
    build: nullableNumber,
  }),
  rollRecords: z.array(
    z.object({ purpose: z.string(), dice: z.string(), result: z.number().int(), source: z.string() }),
  ),
})

const rulesSchema = z.object({
  pointBuyBudget: z.number().int(),
  pointBuyMinimum: z.number().int(),
  pointBuyMaximum: z.number().int(),
  pointBuyRecommendedMinimum: z.number().int(),
  minimumAge: z.number().int(),
  maximumAge: z.number().int(),
  characteristicFloor: z.number().int(),
  luckDice: z.string(),
  eduImprovementCheckDice: z.string(),
  eduImprovementGainDice: z.string(),
})

const myCharacterSheetSchema = z.object({
  investigatorId: z.string(),
  status: statusSchema,
  playerName: z.string().nullable(),
  changeRequestComment: z.string().nullable(),
  characterSheet: characterSheetViewSchema,
  rules: rulesSchema,
  validationErrors: z.array(validationErrorSchema),
})

const keeperInvestigatorSchema = z.object({
  id: z.string(),
  status: statusSchema,
  playerName: z.string().nullable(),
  changeRequestComment: z.string().nullable(),
  updatedAt: z.string(),
  characterSheet: characterSheetViewSchema,
  warnings: z.array(validationErrorSchema),
})

const validationProblemSchema = z.object({ validationErrors: z.array(validationErrorSchema) })

function investigatorsUrl(campaignId: string): string {
  return `/api/campaigns/${campaignId}/investigators`
}

async function send(accessToken: string, url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, headers: authHeaders(accessToken) })
}

/** Throws a conflict error for 409 and a generic error for any other failure. */
function ensureOk(response: Response, action: string): void {
  if (response.status === 409) {
    throw new InvestigatorConflictError()
  }

  if (!response.ok) {
    throw new Error(`Failed to ${action} (${response.status})`)
  }
}

/** Parses the body, or returns null for 404 (outside the caller's visibility). */
async function parseOrNull<T>(response: Response, schema: z.ZodType<T>, action: string): Promise<T | null> {
  if (response.status === 404) {
    return null
  }

  ensureOk(response, action)
  return schema.parse(await response.json())
}

/** POST .../investigators: creates the caller's Draft Investigator. */
export async function createInvestigator(accessToken: string, campaignId: string): Promise<InvestigatorSummary> {
  const response = await send(accessToken, investigatorsUrl(campaignId), { method: 'POST' })
  ensureOk(response, 'create the Investigator')
  return summarySchema.parse(await response.json())
}

/** GET .../investigators/mine; null when the caller has no Investigator. */
export async function getMyInvestigator(accessToken: string, campaignId: string): Promise<InvestigatorSummary | null> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/mine`)
  return parseOrNull(response, summarySchema, 'load your Investigator')
}

/** DELETE .../investigators/mine: "Start over" for a Draft. */
export async function deleteMyInvestigator(accessToken: string, campaignId: string): Promise<void> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/mine`, { method: 'DELETE' })
  ensureOk(response, 'delete the draft')
}

/** POST .../investigators/mine/submit; a 422 returns the remaining validation errors. */
export async function submitMyInvestigator(accessToken: string, campaignId: string): Promise<SubmitResult> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/mine/submit`, { method: 'POST' })
  if (response.status === 422) {
    const problem = validationProblemSchema.parse(await response.json())
    return { kind: 'invalid', validationErrors: problem.validationErrors }
  }

  ensureOk(response, 'submit the Investigator')
  return { kind: 'submitted', investigator: summarySchema.parse(await response.json()) }
}

/** GET .../investigators/mine/character-sheet; null when the caller has no Investigator. */
export async function getMyCharacterSheet(accessToken: string, campaignId: string): Promise<MyCharacterSheet | null> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/mine/character-sheet`)
  return parseOrNull(response, myCharacterSheetSchema, 'load your Character Sheet')
}

/** PUT .../investigators/mine/character-sheet: saves the inputs and returns the recomputed sheet. */
export async function saveMyCharacterSheet(
  accessToken: string,
  campaignId: string,
  inputs: CharacterSheetInputs,
): Promise<MyCharacterSheet> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/mine/character-sheet`, {
    method: 'PUT',
    body: JSON.stringify(inputs),
  })
  ensureOk(response, 'save your Investigator')
  return myCharacterSheetSchema.parse(await response.json())
}

/** GET .../investigators (Keeper only); null for anyone else. */
export async function listInvestigators(accessToken: string, campaignId: string): Promise<InvestigatorListItem[] | null> {
  const response = await send(accessToken, investigatorsUrl(campaignId))
  return parseOrNull(response, z.array(listItemSchema), 'load the Investigators')
}

/** GET .../investigators/{id} (Keeper only, non-Draft); null outside the Keeper's visibility. */
export async function getInvestigatorForKeeper(
  accessToken: string,
  campaignId: string,
  investigatorId: string,
): Promise<KeeperInvestigator | null> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/${investigatorId}`)
  return parseOrNull(response, keeperInvestigatorSchema, 'load the Investigator')
}

/** POST .../investigators/{id}/approve: Character Approval. */
export async function approveInvestigator(
  accessToken: string,
  campaignId: string,
  investigatorId: string,
): Promise<KeeperInvestigator> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/${investigatorId}/approve`, { method: 'POST' })
  ensureOk(response, 'approve the Investigator')
  return keeperInvestigatorSchema.parse(await response.json())
}

/** POST .../investigators/{id}/request-changes with the Keeper's comment. */
export async function requestChanges(
  accessToken: string,
  campaignId: string,
  investigatorId: string,
  comment: string,
): Promise<KeeperInvestigator> {
  const response = await send(accessToken, `${investigatorsUrl(campaignId)}/${investigatorId}/request-changes`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  })
  ensureOk(response, 'request changes')
  return keeperInvestigatorSchema.parse(await response.json())
}
