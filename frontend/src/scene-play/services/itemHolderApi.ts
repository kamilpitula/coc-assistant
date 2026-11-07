import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { richTextSchema } from '@/scenario-preparation/services/sceneApi'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import { keeperRevealSchema } from '@/scene-play/services/revealSchemas'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import type { RichTextDocument } from '@/shared/types/RichText'

// An Item an Investigator holds: the give Reveal's id and snapshot, newest first (specs/scene-play/spec.md, API Contracts).
export interface HeldItem {
  revealId: string
  name: string
  description: RichTextDocument
  /** ISO 8601. */
  givenAt: string
}

/** The caller's Investigator with the Items it holds; the name may be missing. It names no Item ids (PBI-SPL-003). */
export interface MyHeldItems {
  investigatorName: string | null
  items: HeldItem[]
}

/** An Investigator's held Items as the Keeper sees them: each names its Item id. */
export interface InvestigatorHeldItems {
  investigatorName: string | null
  items: (HeldItem & { itemId: string })[]
}

// Strict, so a field the contract does not name (an Item id on a Player read) is rejected instead of silently passed on.
const heldItemShape = {
  revealId: z.string(),
  name: z.string(),
  description: richTextSchema,
  givenAt: z.string(),
}

const myHeldItemsSchema = z.strictObject({ investigatorName: z.string().nullable(), items: z.array(z.strictObject(heldItemShape)) })

const investigatorHeldItemsSchema = z.strictObject({
  investigatorName: z.string().nullable(),
  items: z.array(z.strictObject({ ...heldItemShape, itemId: z.string() })),
})

export const heldItemsQueryKeys = {
  /** Every held-Items read of the Campaign, for example after an Item is given or taken back. */
  all: (campaignId: string) => ['campaigns', campaignId, 'held-items'] as const,
  mine: (campaignId: string) => ['campaigns', campaignId, 'held-items', 'mine'] as const,
  investigator: (campaignId: string, investigatorId: string) =>
    ['campaigns', campaignId, 'held-items', 'investigators', investigatorId] as const,
}

/** The API answered 404 to a give: the Item or Campaign is outside the caller's visibility, or missing. */
export class GiveItemNotFoundError extends Error {
  constructor() {
    super('The Item was not found')
    this.name = 'GiveItemNotFoundError'
  }
}

/** The API answered 400 to a give: the Item or the Investigator was refused, naming which. */
export class GiveItemRefusedError extends Error {
  readonly field: 'itemId' | 'investigatorId'

  constructor(field: 'itemId' | 'investigatorId') {
    super(field === 'itemId' ? 'The Item can not be given now' : 'That Investigator can not hold the Item now')
    this.name = 'GiveItemRefusedError'
    this.field = field
  }
}

/** The API answered 409 to a give: another change won the race; fetch again and try again. */
export class GiveItemConflictError extends Error {
  constructor() {
    super('Another change won the race. Fetch again and try again.')
    this.name = 'GiveItemConflictError'
  }
}

/** The API answered 404 to a take-back: the Item or Campaign is outside the caller's visibility, or missing. */
export class TakeBackItemNotFoundError extends Error {
  constructor() {
    super('The Item was not found')
    this.name = 'TakeBackItemNotFoundError'
  }
}

/** The API answered 409 to a take-back: another change won the race; fetch again and try again. */
export class TakeBackConflictError extends Error {
  constructor() {
    super('Another change won the race. Fetch again and try again.')
    this.name = 'TakeBackConflictError'
  }
}

const itemsUrl = (campaignId: string): string => `/api/campaigns/${campaignId}/items`

async function failGive(response: Response): Promise<never> {
  if (response.status === 404) {
    throw new GiveItemNotFoundError()
  }
  if (response.status === 409) {
    throw new GiveItemConflictError()
  }
  if (response.status === 400) {
    const paths = (await readValidationProblems(response)).map((problem) => problem.path)
    throw paths.includes('investigatorid') ? new GiveItemRefusedError('investigatorId') : new GiveItemRefusedError('itemId')
  }
  throw new Error(`Failed to give the Item (${response.status})`)
}

/** Calls POST .../items/{itemId}/give (Keeper only); returns the created give Reveal as the Keeper sees it. */
export async function giveItem(accessToken: string, campaignId: string, itemId: string, investigatorId: string): Promise<KeeperReveal> {
  const response = await fetch(`${itemsUrl(campaignId)}/${itemId}/give`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ investigatorId }),
  })

  return response.ok ? keeperRevealSchema.parse(await response.json()) : failGive(response)
}

/** Calls POST .../items/{itemId}/take-back (Keeper only); taking back an unheld Item is a no-op (204). */
export async function takeBackItem(accessToken: string, campaignId: string, itemId: string): Promise<void> {
  const response = await fetch(`${itemsUrl(campaignId)}/${itemId}/take-back`, { method: 'POST', headers: authHeaders(accessToken) })

  if (response.status === 404) {
    throw new TakeBackItemNotFoundError()
  }
  if (response.status === 409) {
    throw new TakeBackConflictError()
  }
  if (!response.ok) {
    throw new Error(`Failed to take the Item back (${response.status})`)
  }
}

async function getHeldItems<T>(accessToken: string, url: string, schema: z.ZodType<T>): Promise<T | null> {
  const response = await fetch(url, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Items (${response.status})`)
  }

  return schema.parse(await response.json())
}

/** Calls GET .../investigators/mine/items: the caller's Investigator with the Items it holds, newest first. */
export async function getMyHeldItems(accessToken: string, campaignId: string): Promise<MyHeldItems | null> {
  return getHeldItems(accessToken, `/api/campaigns/${campaignId}/investigators/mine/items`, myHeldItemsSchema)
}

/** Calls GET .../investigators/{investigatorId}/items (Keeper only): an Investigator with the Items it holds. */
export async function getInvestigatorHeldItems(
  accessToken: string,
  campaignId: string,
  investigatorId: string,
): Promise<InvestigatorHeldItems | null> {
  return getHeldItems(accessToken, `/api/campaigns/${campaignId}/investigators/${investigatorId}/items`, investigatorHeldItemsSchema)
}
