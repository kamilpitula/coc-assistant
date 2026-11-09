import { z } from 'zod'

import { apiFetch } from '@/shared/services/apiFetch'
import { authHeaders } from '@/campaign-play/services/authHeaders'
import { keeperRevealSchema, playerRevealSchema } from '@/scene-play/services/revealSchemas'
import type { KeeperSceneHistory, PlayerSceneHistory, SceneHistory } from '@/scene-play/types/SceneHistory'

// Strict, so a field the contract does not name (a present list or recipients on a Player view) is rejected, not passed on.
const keeperHistorySceneSchema = z.strictObject({
  sceneId: z.string(),
  scenarioId: z.string(),
  scenarioTitle: z.string(),
  title: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  investigatorsPresent: z.array(z.strictObject({ id: z.string(), name: z.string().nullable() })),
  reveals: z.array(keeperRevealSchema),
})

const playerHistorySceneSchema = z.strictObject({
  sceneId: z.string(),
  scenarioTitle: z.string(),
  title: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  reveals: z.array(playerRevealSchema),
})

// The Player shape always carries an Investigator name, so it tells the two apart.
const sceneHistorySchema = z.union([
  z.strictObject({ scenes: z.array(keeperHistorySceneSchema) }).transform((history): KeeperSceneHistory => ({ kind: 'keeper', ...history })),
  z
    .strictObject({ investigatorName: z.string().nullable(), scenes: z.array(playerHistorySceneSchema) })
    .transform((history): PlayerSceneHistory => ({ kind: 'player', ...history })),
])

export const sceneHistoryQueryKeys = {
  detail: (campaignId: string) => ['campaigns', campaignId, 'scene-history'] as const,
}

/** The API answered 404: the caller is not a member of the Campaign, or it does not exist. */
export class SceneHistoryNotFoundError extends Error {
  constructor() {
    super('The Scene History was not found')
    this.name = 'SceneHistoryNotFoundError'
  }
}

/** Calls GET .../scene-history: the Campaign's played Scenes as the caller may see them, newest started first. */
export async function getSceneHistory(accessToken: string, campaignId: string): Promise<SceneHistory> {
  const response = await apiFetch(`/api/campaigns/${campaignId}/scene-history`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    throw new SceneHistoryNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Scene History (${response.status})`)
  }

  return sceneHistorySchema.parse(await response.json())
}
