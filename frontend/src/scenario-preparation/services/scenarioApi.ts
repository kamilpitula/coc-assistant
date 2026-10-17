import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { SCENARIO_FIELD_MESSAGES, type ScenarioFieldErrors } from '@/scenario-preparation/services/scenarioForm'
import { readErrorKeys } from '@/scenario-preparation/services/validationProblem'
import type { Scenario, ScenarioInput } from '@/scenario-preparation/types/Scenario'

// Strict, so a field the contract does not name (such as a position) is rejected instead of silently passed on.
const scenarioSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  keeperNotes: z.string(),
})

const scenarioListSchema = z.strictObject({ scenarios: z.array(scenarioSchema) })

export const scenarioQueryKeys = {
  all: (campaignId: string) => ['campaigns', campaignId, 'scenarios'] as const,
  list: (campaignId: string) => ['campaigns', campaignId, 'scenarios', 'list'] as const,
  detail: (campaignId: string, scenarioId: string) => ['campaigns', campaignId, 'scenarios', scenarioId] as const,
}

/** The API answered 404: the Campaign or Scenario is outside the caller's visibility, or missing. */
export class ScenarioNotFoundError extends Error {
  constructor() {
    super('The Scenario was not found')
    this.name = 'ScenarioNotFoundError'
  }
}

/** The API answered 400 with field errors, mapped to the form's messages. */
export class ScenarioValidationError extends Error {
  readonly fieldErrors: ScenarioFieldErrors

  constructor(fieldErrors: ScenarioFieldErrors) {
    super('The Scenario was refused')
    this.name = 'ScenarioValidationError'
    this.fieldErrors = fieldErrors
  }
}

/** The API answered 409: the requested order is not the Campaign's current set of Scenarios. */
export class StaleScenarioOrderError extends Error {
  constructor() {
    super('The Scenario order is stale')
    this.name = 'StaleScenarioOrderError'
  }
}

const scenariosUrl = (campaignId: string): string => `/api/campaigns/${campaignId}/scenarios`

/** Maps the keys of a ValidationProblemDetails body (any casing) to the form's fields and messages. */
async function readFieldErrors(response: Response): Promise<ScenarioFieldErrors> {
  const keys = await readErrorKeys(response)
  const errors: ScenarioFieldErrors = {}
  if (keys.includes('title')) {
    errors.title = SCENARIO_FIELD_MESSAGES.title
  }
  if (keys.includes('keepernotes')) {
    errors.keeperNotes = SCENARIO_FIELD_MESSAGES.keeperNotes
  }
  return errors
}

async function failWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new ScenarioNotFoundError()
  }
  if (response.status === 400) {
    throw new ScenarioValidationError(await readFieldErrors(response))
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

/** Calls GET /api/campaigns/{id}/scenarios: the Campaign's Scenarios in Campaign order (Keeper only). */
export async function getScenarios(accessToken: string, campaignId: string): Promise<Scenario[]> {
  const response = await fetch(scenariosUrl(campaignId), { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    throw new ScenarioNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Scenarios (${response.status})`)
  }

  return scenarioListSchema.parse(await response.json()).scenarios
}

/** Calls GET /api/campaigns/{id}/scenarios/{scenarioId}; null when the API answers 404. */
export async function getScenario(accessToken: string, campaignId: string, scenarioId: string): Promise<Scenario | null> {
  const response = await fetch(`${scenariosUrl(campaignId)}/${scenarioId}`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Scenario (${response.status})`)
  }

  return scenarioSchema.parse(await response.json())
}

/** Calls POST /api/campaigns/{id}/scenarios, which appends the Scenario after the existing ones. */
export async function createScenario(accessToken: string, campaignId: string, input: ScenarioInput): Promise<Scenario> {
  const response = await fetch(scenariosUrl(campaignId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ title: input.title, keeperNotes: input.keeperNotes }),
  })

  if (!response.ok) {
    return failWrite(response, 'create the Scenario')
  }

  return scenarioSchema.parse(await response.json())
}

/** Calls PUT /api/campaigns/{id}/scenarios/{scenarioId}, which replaces the title and Keeper notes. */
export async function editScenario(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  input: ScenarioInput,
): Promise<Scenario> {
  const response = await fetch(`${scenariosUrl(campaignId)}/${scenarioId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ title: input.title, keeperNotes: input.keeperNotes }),
  })

  if (!response.ok) {
    return failWrite(response, 'save the Scenario')
  }

  return scenarioSchema.parse(await response.json())
}

/** Calls PUT /api/campaigns/{id}/scenarios/order with every Scenario id; returns the Scenarios in the new order. */
export async function reorderScenarios(accessToken: string, campaignId: string, scenarioIds: string[]): Promise<Scenario[]> {
  const response = await fetch(`${scenariosUrl(campaignId)}/order`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ scenarioIds }),
  })

  if (response.status === 409) {
    throw new StaleScenarioOrderError()
  }
  if (response.status === 404) {
    throw new ScenarioNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to change the Scenario order (${response.status})`)
  }

  return scenarioListSchema.parse(await response.json()).scenarios
}
