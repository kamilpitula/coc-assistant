import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { SCENE_FIELD_MESSAGES, type SceneFieldErrors } from '@/scenario-preparation/services/sceneForm'
import { readErrorKeys } from '@/scenario-preparation/services/validationProblem'
import type { Scene, SceneInput, SceneSummary } from '@/scenario-preparation/types/Scene'

const sceneStatusSchema = z.enum(['Prepared', 'Active', 'Finished'])

// Strict, so a field the contract does not name (such as a position) is rejected instead of silently passed on.
const sceneSummarySchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  status: sceneStatusSchema,
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
})

// Only the inside of keeperNotes is loose: the editor and the server validate the nodes (ADR 0015).
export const richTextSchema = z.looseObject({
  root: z.looseObject({ type: z.literal('root'), children: z.array(z.unknown()) }),
})

// The link carries the entity reference only: no profile data beyond the name (design record PBI-SP-004, D8).
export const nonPlayerEntityLinkSchema = z.strictObject({
  id: z.string(),
  nonPlayerEntity: z.strictObject({
    id: z.string(),
    type: z.enum(['HumanNpc', 'MythosCreature']),
    name: z.string(),
  }),
  playerFacingName: z.string(),
  playerFacingDescription: richTextSchema.nullable(),
})

// The link carries the Item's id and live name only: it has no fields of its own (design record PBI-SP-008, D2).
export const itemLinkSchema = z.strictObject({
  id: z.string(),
  item: z.strictObject({ id: z.string(), name: z.string() }),
})

// A Handout in a Scene's list: no content and no position (design record PBI-SP-005, D2).
export const handoutSummarySchema = z.strictObject({
  id: z.string(),
  kind: z.enum(['ReadAloud', 'Text', 'Image', 'Document', 'Map']),
  visibility: z.enum(['PlayerFacing', 'KeeperFacing']),
  title: z.string(),
})

const sceneSchema = sceneSummarySchema.extend({
  location: z.string(),
  keeperNotes: richTextSchema.nullable(),
  nonPlayerEntityLinks: z.array(nonPlayerEntityLinkSchema),
  itemLinks: z.array(itemLinkSchema),
  handouts: z.array(handoutSummarySchema),
})

const sceneListSchema = z.strictObject({ scenes: z.array(sceneSummarySchema) })

export const sceneQueryKeys = {
  all: (campaignId: string, scenarioId: string) => ['campaigns', campaignId, 'scenarios', scenarioId, 'scenes'] as const,
  list: (campaignId: string, scenarioId: string) => ['campaigns', campaignId, 'scenarios', scenarioId, 'scenes', 'list'] as const,
  detail: (campaignId: string, scenarioId: string, sceneId: string) =>
    ['campaigns', campaignId, 'scenarios', scenarioId, 'scenes', sceneId] as const,
}

/** The API answered 404: the Campaign, Scenario, or Scene is outside the caller's visibility, or missing. */
export class SceneNotFoundError extends Error {
  constructor() {
    super('The Scene was not found')
    this.name = 'SceneNotFoundError'
  }
}

/** The API answered 400 with field errors, mapped to the form's messages. */
export class SceneValidationError extends Error {
  readonly fieldErrors: SceneFieldErrors

  constructor(fieldErrors: SceneFieldErrors) {
    super('The Scene was refused')
    this.name = 'SceneValidationError'
    this.fieldErrors = fieldErrors
  }
}

/** The API answered 409 to a reorder: the requested order is not the Scenario's current set of Scenes. */
export class StaleSceneOrderError extends Error {
  constructor() {
    super('The Scene order is stale')
    this.name = 'StaleSceneOrderError'
  }
}

/** The API answered 409 to a save: the Scene is Finished and can't be changed. */
export class SceneFinishedError extends Error {
  constructor() {
    super('The Scene is finished')
    this.name = 'SceneFinishedError'
  }
}

/** The API answered 409 to a removal: only a Prepared Scene can be removed. */
export class SceneNotRemovableError extends Error {
  constructor() {
    super('The Scene is not Prepared')
    this.name = 'SceneNotRemovableError'
  }
}

const scenesUrl = (campaignId: string, scenarioId: string): string =>
  `/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes`

/** Maps the keys of a ValidationProblemDetails body (any casing) to the form's fields and messages. */
async function readFieldErrors(response: Response): Promise<SceneFieldErrors> {
  const keys = await readErrorKeys(response)
  const errors: SceneFieldErrors = {}
  if (keys.includes('title')) {
    errors.title = SCENE_FIELD_MESSAGES.title
  }
  if (keys.includes('location')) {
    errors.location = SCENE_FIELD_MESSAGES.location
  }
  if (keys.includes('keepernotes')) {
    errors.keeperNotes = SCENE_FIELD_MESSAGES.keeperNotes
  }
  return errors
}

async function failWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new SceneNotFoundError()
  }
  if (response.status === 400) {
    throw new SceneValidationError(await readFieldErrors(response))
  }
  if (response.status === 409) {
    throw new SceneFinishedError()
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

const toBody = (input: SceneInput): string =>
  JSON.stringify({ title: input.title, location: input.location === '' ? null : input.location, keeperNotes: input.keeperNotes })

/** Calls GET .../scenes: the Scenario's Scenes in prepared order (Keeper only). */
export async function getScenes(accessToken: string, campaignId: string, scenarioId: string): Promise<SceneSummary[]> {
  const response = await fetch(scenesUrl(campaignId, scenarioId), { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    throw new SceneNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Scenes (${response.status})`)
  }

  return sceneListSchema.parse(await response.json()).scenes
}

/** Calls GET .../scenes/{sceneId}; null when the API answers 404. */
export async function getScene(accessToken: string, campaignId: string, scenarioId: string, sceneId: string): Promise<Scene | null> {
  const response = await fetch(`${scenesUrl(campaignId, scenarioId)}/${sceneId}`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Scene (${response.status})`)
  }

  return sceneSchema.parse(await response.json())
}

/** Calls POST .../scenes, which appends a Prepared Scene after the existing ones. */
export async function createScene(accessToken: string, campaignId: string, scenarioId: string, input: SceneInput): Promise<Scene> {
  const response = await fetch(scenesUrl(campaignId, scenarioId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: toBody(input),
  })

  if (!response.ok) {
    return failWrite(response, 'create the Scene')
  }

  return sceneSchema.parse(await response.json())
}

/** Calls PUT .../scenes/{sceneId}, which replaces the title, location, and Keeper notes. */
export async function editScene(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  input: SceneInput,
): Promise<Scene> {
  const response = await fetch(`${scenesUrl(campaignId, scenarioId)}/${sceneId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: toBody(input),
  })

  if (!response.ok) {
    return failWrite(response, 'save the Scene')
  }

  return sceneSchema.parse(await response.json())
}

/** Calls DELETE .../scenes/{sceneId}; a Scene that is no longer Prepared is refused with 409. */
export async function removeScene(accessToken: string, campaignId: string, scenarioId: string, sceneId: string): Promise<void> {
  const response = await fetch(`${scenesUrl(campaignId, scenarioId)}/${sceneId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (response.status === 409) {
    throw new SceneNotRemovableError()
  }
  if (response.status === 404) {
    throw new SceneNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to remove the Scene (${response.status})`)
  }
}

/** Calls PUT .../scenes/order with every Scene id; returns the Scenes in the new order. */
export async function reorderScenes(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneIds: string[],
): Promise<SceneSummary[]> {
  const response = await fetch(`${scenesUrl(campaignId, scenarioId)}/order`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ sceneIds }),
  })

  if (response.status === 409) {
    throw new StaleSceneOrderError()
  }
  if (response.status === 404) {
    throw new SceneNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to change the Scene order (${response.status})`)
  }

  return sceneListSchema.parse(await response.json()).scenes
}
