import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { handoutSummarySchema, richTextSchema, SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import type { Handout, HandoutField, HandoutInput, HandoutSummary } from '@/scenario-preparation/types/Handout'

/** The messages the server returned for a refused Handout, by field (ADR 0018). */
export type HandoutFieldErrors = Partial<Record<HandoutField, string>>

// Strict, so a field the contract does not name (such as a position) is rejected instead of silently passed on.
const handoutSchema = handoutSummarySchema.extend({ content: richTextSchema })

const handoutListSchema = z.strictObject({ handouts: z.array(handoutSummarySchema) })

export const handoutQueryKeys = {
  detail: (campaignId: string, scenarioId: string, sceneId: string, handoutId: string) =>
    ['campaigns', campaignId, 'scenarios', scenarioId, 'scenes', sceneId, 'handouts', handoutId] as const,
}

/** The API answered 404: the Handout, or its Scene, is outside the caller's visibility or gone. */
export class HandoutNotFoundError extends Error {
  constructor() {
    super('The Handout was not found')
    this.name = 'HandoutNotFoundError'
  }
}

/** The API answered 400 with the server's message for each refused field. */
export class HandoutValidationError extends Error {
  readonly fieldErrors: HandoutFieldErrors

  constructor(fieldErrors: HandoutFieldErrors) {
    super('The Handout was refused')
    this.name = 'HandoutValidationError'
    this.fieldErrors = fieldErrors
  }
}

/** The API answered 409 to a delete: only a Handout on a Prepared Scene can be deleted. */
export class HandoutNotDeletableError extends Error {
  constructor() {
    super('The Scene is not Prepared')
    this.name = 'HandoutNotDeletableError'
  }
}

/** The API answered 409 to a reorder: the requested order is not the Scene's current set of Handouts. */
export class StaleHandoutOrderError extends Error {
  constructor() {
    super('The Handout order is stale')
    this.name = 'StaleHandoutOrderError'
  }
}

const FIELDS: Record<string, HandoutField> = {
  title: 'title',
  kind: 'kind',
  visibility: 'visibility',
  content: 'content',
}

const handoutsUrl = (campaignId: string, scenarioId: string, sceneId: string): string =>
  `/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}/handouts`

async function readFieldErrors(response: Response): Promise<HandoutFieldErrors> {
  const errors: HandoutFieldErrors = {}
  for (const problem of await readValidationProblems(response)) {
    const field = FIELDS[problem.path]
    if (field && problem.messages[0]) {
      errors[field] = problem.messages[0]
    }
  }
  return errors
}

// For Handout writes other than delete and reorder, a 409 only means the Scene is Finished.
async function failWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new HandoutNotFoundError()
  }
  if (response.status === 400) {
    throw new HandoutValidationError(await readFieldErrors(response))
  }
  if (response.status === 409) {
    throw new SceneFinishedError()
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

const toBody = (input: HandoutInput): string =>
  JSON.stringify({ kind: input.kind, visibility: input.visibility, title: input.title, content: input.content })

/** Calls GET .../handouts/{handoutId}; null when the API answers 404. */
export async function getHandout(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  handoutId: string,
): Promise<Handout | null> {
  const response = await fetch(`${handoutsUrl(campaignId, scenarioId, sceneId)}/${handoutId}`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Handout (${response.status})`)
  }

  return handoutSchema.parse(await response.json())
}

/** Calls POST .../handouts, which adds a Handout after the Scene's others. */
export async function createHandout(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  input: HandoutInput,
): Promise<Handout> {
  const response = await fetch(handoutsUrl(campaignId, scenarioId, sceneId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: toBody(input),
  })

  if (!response.ok) {
    return failWrite(response, 'create the Handout')
  }

  return handoutSchema.parse(await response.json())
}

/** Calls PUT .../handouts/{handoutId}, which replaces the kind, visibility, title, and content. */
export async function editHandout(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  handoutId: string,
  input: HandoutInput,
): Promise<Handout> {
  const response = await fetch(`${handoutsUrl(campaignId, scenarioId, sceneId)}/${handoutId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: toBody(input),
  })

  if (!response.ok) {
    return failWrite(response, 'save the Handout')
  }

  return handoutSchema.parse(await response.json())
}

/** Calls DELETE .../handouts/{handoutId}. A Handout that is already gone (404) counts as deleted; a 409 is refused. */
export async function deleteHandout(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  handoutId: string,
): Promise<void> {
  const response = await fetch(`${handoutsUrl(campaignId, scenarioId, sceneId)}/${handoutId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (response.status === 409) {
    throw new HandoutNotDeletableError()
  }
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete the Handout (${response.status})`)
  }
}

/** Calls PUT .../handouts/order with every Handout id; returns the Handouts in the new order. */
export async function reorderHandouts(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  handoutIds: string[],
): Promise<HandoutSummary[]> {
  const response = await fetch(`${handoutsUrl(campaignId, scenarioId, sceneId)}/order`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ handoutIds }),
  })

  if (response.status === 409) {
    throw new StaleHandoutOrderError()
  }
  if (response.status === 404) {
    throw new HandoutNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to change the Handout order (${response.status})`)
  }

  return handoutListSchema.parse(await response.json()).handouts
}
