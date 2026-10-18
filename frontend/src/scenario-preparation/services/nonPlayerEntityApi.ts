import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'

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
}

/** The API answered 404: the Campaign or Non-Player Entity is outside the caller's visibility, or missing. */
export class NonPlayerEntityNotFoundError extends Error {
  constructor() {
    super('The Non-Player Entity was not found')
    this.name = 'NonPlayerEntityNotFoundError'
  }
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
