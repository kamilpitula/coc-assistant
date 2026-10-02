import { z } from 'zod'

import type { Campaign, CreateCampaignInput } from '@/campaign-play/types/Campaign'
import type { CampaignInvite } from '@/campaign-play/types/CampaignInvite'
import type { JoinOutcome, JoinResult } from '@/campaign-play/types/JoinResult'

const campaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  keeperAccountId: z.string(),
  playerLimit: z.number().int(),
})

const inviteResponseSchema = z.object({
  campaignId: z.string(),
  token: z.string(),
  status: z.string(),
})

const joinResponseSchema = z.object({
  outcome: z.string(),
  campaignId: z.string().nullable(),
})

export const campaignQueryKeys = {
  all: ['campaigns'] as const,
  invite: (campaignId: string) => ['campaigns', campaignId, 'invite'] as const,
}

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/** Calls POST /api/campaigns, which records the authenticated caller as the new Campaign's Keeper. */
export async function createCampaign(
  accessToken: string,
  input: CreateCampaignInput,
): Promise<Campaign> {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name: input.name, playerLimit: input.playerLimit }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create the campaign (${response.status})`)
  }

  return campaignResponseSchema.parse(await response.json())
}

/** Calls GET /api/campaigns/{id}/invite; returns null when the Keeper has no active Invite. */
export async function getActiveInvite(
  accessToken: string,
  campaignId: string,
): Promise<CampaignInvite | null> {
  const response = await fetch(`/api/campaigns/${campaignId}/invite`, {
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load the invite (${response.status})`)
  }

  return inviteResponseSchema.parse(await response.json())
}

/** Calls POST /api/campaigns/{id}/invite to issue (or return the existing) active Campaign Invite. */
export async function issueInvite(accessToken: string, campaignId: string): Promise<CampaignInvite> {
  const response = await fetch(`/api/campaigns/${campaignId}/invite`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })

  if (!response.ok) {
    throw new Error(`Failed to issue the invite (${response.status})`)
  }

  return inviteResponseSchema.parse(await response.json())
}

/** Calls POST /api/campaigns/{id}/invite/replace to replace the active Invite with a fresh token. */
export async function replaceInvite(
  accessToken: string,
  campaignId: string,
): Promise<CampaignInvite> {
  const response = await fetch(`/api/campaigns/${campaignId}/invite/replace`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })

  if (!response.ok) {
    throw new Error(`Failed to replace the invite (${response.status})`)
  }

  return inviteResponseSchema.parse(await response.json())
}

/** Calls DELETE /api/campaigns/{id}/invite to revoke the active Campaign Invite. */
export async function revokeInvite(accessToken: string, campaignId: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/invite`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (!response.ok) {
    throw new Error(`Failed to revoke the invite (${response.status})`)
  }
}

/** Calls POST /api/campaigns/join to admit the caller as a Player, mapping invite-state responses to an outcome. */
export async function joinCampaign(accessToken: string, token: string): Promise<JoinResult> {
  const response = await fetch('/api/campaigns/join', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ token }),
  })

  if (response.status === 404) {
    return { outcome: 'InvalidInvite', campaignId: null }
  }

  // 200 Joined/AlreadyMember, 409 LimitReached, and 400 KeeperCannotJoin all carry an outcome body.
  if (!response.ok && response.status !== 409 && response.status !== 400) {
    throw new Error(`Failed to join the campaign (${response.status})`)
  }

  const body = joinResponseSchema.parse(await response.json())
  return { outcome: body.outcome as JoinOutcome, campaignId: body.campaignId }
}
