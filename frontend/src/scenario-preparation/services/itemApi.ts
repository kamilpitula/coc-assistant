import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { handoutSummarySchema, richTextSchema, sceneStatusSchema } from '@/scenario-preparation/services/sceneApi'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import type { Item, ItemField, ItemInPlayReason, ItemInput, ItemSummary } from '@/scenario-preparation/types/Item'

/** The messages the server returned for a refused Item, by field (ADR 0018). */
export type ItemFieldErrors = Partial<Record<ItemField, string>>

// Strict, so a field the contract does not name (such as a position) is rejected instead of silently passed on.
const itemSummarySchema = z.strictObject({ id: z.string(), name: z.string(), sceneCount: z.number().int().nonnegative() })

const itemListSchema = z.strictObject({ items: z.array(itemSummarySchema) })

const itemSceneSchema = z.strictObject({
  scenarioId: z.string(),
  scenarioTitle: z.string(),
  id: z.string(),
  title: z.string(),
  status: sceneStatusSchema,
})

// The holder is always null until PBI-SPL-003 lets an Investigator hold an Item; that PBI widens this schema.
const itemSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  playerFacingDescription: richTextSchema,
  keeperNotes: richTextSchema.nullable(),
  holder: z.null(),
  handouts: z.array(handoutSummarySchema),
  scenes: z.array(itemSceneSchema),
})

export const itemQueryKeys = {
  all: (campaignId: string) => ['campaigns', campaignId, 'items'] as const,
  list: (campaignId: string) => ['campaigns', campaignId, 'items', 'list'] as const,
  detail: (campaignId: string, itemId: string) => ['campaigns', campaignId, 'items', itemId] as const,
}

/** The 409 titles of a refused delete, by reason (specs/scenario-preparation/spec.md, Item API; design record PBI-SP-008). */
const HELD_TITLE = "An Item held by an Investigator can't be deleted."

/** The API answered 404: the Campaign or Item is outside the caller's visibility, or missing. */
export class ItemNotFoundError extends Error {
  constructor() {
    super('The Item was not found')
    this.name = 'ItemNotFoundError'
  }
}

/** The API answered 400 with the server's message for each refused field. */
export class ItemValidationError extends Error {
  readonly fieldErrors: ItemFieldErrors

  constructor(fieldErrors: ItemFieldErrors) {
    super('The Item was refused')
    this.name = 'ItemValidationError'
    this.fieldErrors = fieldErrors
  }
}

/** The API answered 409 to a delete: the Item is part of a Scene that has been played, or an Investigator holds it. */
export class ItemNotDeletableError extends Error {
  readonly reason: ItemInPlayReason

  constructor(reason: ItemInPlayReason) {
    super('The Item can not be deleted now')
    this.name = 'ItemNotDeletableError'
    this.reason = reason
  }
}

const FIELDS: Record<string, ItemField> = {
  name: 'name',
  playerfacingdescription: 'playerFacingDescription',
  keepernotes: 'keeperNotes',
}

const itemsUrl = (campaignId: string): string => `/api/campaigns/${campaignId}/items`

async function readFieldErrors(response: Response): Promise<ItemFieldErrors> {
  const errors: ItemFieldErrors = {}
  for (const problem of await readValidationProblems(response)) {
    const field = FIELDS[problem.path]
    if (field && problem.messages[0]) {
      errors[field] = problem.messages[0]
    }
  }
  return errors
}

async function failWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new ItemNotFoundError()
  }
  if (response.status === 400) {
    throw new ItemValidationError(await readFieldErrors(response))
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

const toBody = (input: ItemInput): string =>
  JSON.stringify({ name: input.name, playerFacingDescription: input.playerFacingDescription, keeperNotes: input.keeperNotes })

/** Calls GET .../items: the Campaign's Items with their Scene counts, ordered by name (Keeper only). */
export async function getItems(accessToken: string, campaignId: string): Promise<ItemSummary[]> {
  const response = await fetch(itemsUrl(campaignId), { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    throw new ItemNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Items (${response.status})`)
  }

  return itemListSchema.parse(await response.json()).items
}

/** Calls GET .../items/{itemId}; null when the API answers 404. */
export async function getItem(accessToken: string, campaignId: string, itemId: string): Promise<Item | null> {
  const response = await fetch(`${itemsUrl(campaignId)}/${itemId}`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Item (${response.status})`)
  }

  return itemSchema.parse(await response.json())
}

/** Calls POST .../items, which creates an Item. */
export async function createItem(accessToken: string, campaignId: string, input: ItemInput): Promise<Item> {
  const response = await fetch(itemsUrl(campaignId), { method: 'POST', headers: authHeaders(accessToken), body: toBody(input) })

  if (!response.ok) {
    return failWrite(response, 'create the Item')
  }

  return itemSchema.parse(await response.json())
}

/** Calls PUT .../items/{itemId}, which replaces the name, Player-facing description, and Keeper notes. */
export async function editItem(accessToken: string, campaignId: string, itemId: string, input: ItemInput): Promise<Item> {
  const response = await fetch(`${itemsUrl(campaignId)}/${itemId}`, { method: 'PUT', headers: authHeaders(accessToken), body: toBody(input) })

  if (!response.ok) {
    return failWrite(response, 'save the Item')
  }

  return itemSchema.parse(await response.json())
}

async function readDeleteReason(response: Response): Promise<ItemInPlayReason> {
  const body: unknown = await response.json().catch(() => null)
  const title = z.object({ title: z.string() }).safeParse(body)
  return title.success && title.data.title === HELD_TITLE ? 'held' : 'played'
}

/** Calls DELETE .../items/{itemId}. An Item that is already gone (404) counts as deleted; a 409 says why it is refused. */
export async function deleteItem(accessToken: string, campaignId: string, itemId: string): Promise<void> {
  const response = await fetch(`${itemsUrl(campaignId)}/${itemId}`, { method: 'DELETE', headers: authHeaders(accessToken) })

  if (response.status === 409) {
    throw new ItemNotDeletableError(await readDeleteReason(response))
  }
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete the Item (${response.status})`)
  }
}
