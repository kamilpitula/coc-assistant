import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'

// Strict, so a field the contract does not name is rejected instead of silently passed on. Both types are accepted.
const summarySchema = z.strictObject({
  id: z.string(),
  type: z.enum(['HumanNpc', 'MythosCreature']),
  name: z.string(),
})

const listSchema = z.strictObject({ items: z.array(summarySchema) })

export const nonPlayerEntityQueryKeys = {
  all: (campaignId: string) => ['campaigns', campaignId, 'non-player-entities'] as const,
  list: (campaignId: string) => ['campaigns', campaignId, 'non-player-entities', 'list'] as const,
  humanNpc: (campaignId: string, humanNpcId: string) => ['campaigns', campaignId, 'human-npcs', humanNpcId] as const,
  mythosCreature: (campaignId: string, mythosCreatureId: string) => ['campaigns', campaignId, 'mythos-creatures', mythosCreatureId] as const,
}

/** The API answered 404: the Campaign or Non-Player Entity is outside the caller's visibility, or missing. */
export class NonPlayerEntityNotFoundError extends Error {
  constructor() {
    super('The Non-Player Entity was not found')
    this.name = 'NonPlayerEntityNotFoundError'
  }
}

/** The API answered 400 with the refused values, keyed by lower-cased request path (ADR 0018). */
export class NonPlayerEntityValidationError extends Error {
  readonly problems: ValidationProblem[]

  constructor(problems: ValidationProblem[]) {
    super('The Non-Player Entity was refused')
    this.name = 'NonPlayerEntityValidationError'
    this.problems = problems
  }
}

/** Throws what a failed create or save answered: not found for 404, the refused values for 400, otherwise a plain error. */
export async function failNonPlayerEntityWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new NonPlayerEntityNotFoundError()
  }
  if (response.status === 400) {
    throw new NonPlayerEntityValidationError(await readValidationProblems(response))
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

/** Calls GET .../non-player-entities: every Human NPC and Mythos Creature of the Campaign (Keeper only). */
export async function getNonPlayerEntities(accessToken: string, campaignId: string): Promise<NonPlayerEntitySummary[]> {
  const response = await fetch(`/api/campaigns/${campaignId}/non-player-entities`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    throw new NonPlayerEntityNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Non-Player Entities (${response.status})`)
  }

  return listSchema.parse(await response.json()).items
}
