import { z } from 'zod'

import type { Campaign } from '@/campaign-play/types/Campaign'

const campaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  keeperAccountId: z.string(),
})

export const campaignQueryKeys = {
  all: ['campaigns'] as const,
}

/** Calls POST /api/campaigns, which records the authenticated caller as the new Campaign's Keeper. */
export async function createCampaign(accessToken: string, name: string): Promise<Campaign> {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create the campaign (${response.status})`)
  }

  return campaignResponseSchema.parse(await response.json())
}
