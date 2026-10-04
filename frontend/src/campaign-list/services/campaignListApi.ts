import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { campaignQueryKeys, eraSchema } from '@/campaign-play/services/campaignApi'
import { INVESTIGATOR_STATUSES } from '@/campaign-play/types/Investigator'
import type { CampaignListItem } from '@/campaign-list/types/CampaignListItem'

/**
 * GET /api/campaigns items (specs/campaign-list/spec.md, API). Strict per role, so a Player item carrying the Player
 * limit, the awaiting-review count, or any id is rejected instead of passed on (Regression Guardrails).
 */
const campaignListItemSchema = z.discriminatedUnion('role', [
  z.strictObject({
    id: z.string(),
    name: z.string(),
    era: eraSchema,
    role: z.literal('Keeper'),
    playerCount: z.number().int(),
    playerLimit: z.number().int(),
    approvedInvestigatorCount: z.number().int(),
    awaitingReviewCount: z.number().int(),
  }),
  z.strictObject({
    id: z.string(),
    name: z.string(),
    era: eraSchema,
    role: z.literal('Player'),
    keeperName: z.string(),
    playerCount: z.number().int(),
    approvedInvestigatorCount: z.number().int(),
    myInvestigator: z
      .strictObject({ status: z.enum(INVESTIGATOR_STATUSES), name: z.string().nullable() })
      .nullable(),
  }),
])

const campaignListResponseSchema = z.array(campaignListItemSchema)

/** Under the Campaign prefix, so invalidating every Campaign query (as creating one does) refreshes the list too. */
export const campaignListQueryKeys = {
  list: [...campaignQueryKeys.all, 'list'] as const,
}

/** Calls GET /api/campaigns: every Campaign the caller is a Campaign Member of, Keeper items first, newest first. */
export async function getCampaignList(accessToken: string): Promise<CampaignListItem[]> {
  const response = await fetch('/api/campaigns', {
    headers: authHeaders(accessToken),
  })

  if (!response.ok) {
    throw new Error(`Failed to load the campaigns (${response.status})`)
  }

  return campaignListResponseSchema.parse(await response.json())
}
