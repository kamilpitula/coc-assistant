import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import {
  CREATION_METHODS,
  ERAS,
  type Campaign,
  type CampaignView,
  type CreateCampaignInput,
  type CreationMethod,
} from '@/campaign-play/types/Campaign'
import type { CampaignInvite } from '@/campaign-play/types/CampaignInvite'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { INVESTIGATOR_STATUSES } from '@/campaign-play/types/Investigator'
import type { JoinOutcome, JoinResult } from '@/campaign-play/types/JoinResult'

export const eraSchema = z.enum(ERAS)

export const creationMethodSchema = z.enum(CREATION_METHODS)

const campaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  keeperAccountId: z.string(),
  playerLimit: z.number().int(),
  era: eraSchema,
  allowedCreationMethods: z.array(creationMethodSchema).min(1),
  role: z.literal('Keeper'),
})

const playerCampaignResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  era: eraSchema,
  allowedCreationMethods: z.array(creationMethodSchema).min(1),
  role: z.literal('Player'),
})

const campaignViewSchema = z.discriminatedUnion('role', [campaignResponseSchema, playerCampaignResponseSchema])

/**
 * A roster Investigator (specs/campaign-overview/spec.md, Roster with Investigators). Strict, so data beyond what the
 * visibility allows is rejected instead of silently passed on; id is present for the Keeper only.
 */
const rosterInvestigatorSchema = z.discriminatedUnion('visibility', [
  z.strictObject({
    visibility: z.literal('Visible'),
    id: z.string().optional(),
    name: z.string().nullable(),
    status: z.enum(INVESTIGATOR_STATUSES),
  }),
  z.strictObject({ visibility: z.literal('InProgress') }),
  z.strictObject({ visibility: z.literal('NotReady') }),
])

const campaignMembersResponseSchema = z.array(
  z.object({
    memberId: z.string(),
    displayName: z.string(),
    role: z.enum(['Keeper', 'Player']),
    isYou: z.boolean(),
    investigator: rosterInvestigatorSchema.nullable(),
  }),
)

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
  detail: (campaignId: string) => ['campaigns', campaignId] as const,
  invite: (campaignId: string) => ['campaigns', campaignId, 'invite'] as const,
  members: (campaignId: string) => ['campaigns', campaignId, 'members'] as const,
  investigators: (campaignId: string) => ['campaigns', campaignId, 'investigators'] as const,
  investigator: (campaignId: string, investigatorId: string) =>
    ['campaigns', campaignId, 'investigators', investigatorId] as const,
  myInvestigator: (campaignId: string) => ['campaigns', campaignId, 'investigators', 'mine'] as const,
  myCharacterSheet: (campaignId: string) =>
    ['campaigns', campaignId, 'investigators', 'mine', 'character-sheet'] as const,
  occupations: (campaignId: string) => ['campaigns', campaignId, 'rules', 'occupations'] as const,
  skills: (campaignId: string) => ['campaigns', campaignId, 'rules', 'skills'] as const,
  wall: (campaignId: string) => ['campaigns', campaignId, 'wall'] as const,
  wallPreview: (campaignId: string) => ['campaigns', campaignId, 'wall-preview'] as const,
}

/** Calls POST /api/campaigns, which records the authenticated caller as the new Campaign's Keeper. */
export async function createCampaign(
  accessToken: string,
  input: CreateCampaignInput,
): Promise<Campaign> {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      name: input.name,
      playerLimit: input.playerLimit,
      era: input.era,
      allowedCreationMethods: input.allowedCreationMethods,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create the campaign (${response.status})`)
  }

  return campaignResponseSchema.parse(await response.json())
}

/**
 * Calls GET /api/campaigns/{id}: the Keeper view for the Keeper, the reduced view for a Player, and null for anyone
 * who is not a member (404).
 */
export async function getCampaign(accessToken: string, campaignId: string): Promise<CampaignView | null> {
  const response = await fetch(`/api/campaigns/${campaignId}`, {
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load the campaign (${response.status})`)
  }

  return campaignViewSchema.parse(await response.json())
}

/**
 * Calls GET /api/campaigns/{id}/members: the roster in display order (specs/campaign-play/spec.md, Campaign members
 * API), or null for anyone who is not a Campaign Member (404).
 */
export async function getCampaignMembers(accessToken: string, campaignId: string): Promise<CampaignMember[] | null> {
  const response = await fetch(`/api/campaigns/${campaignId}/members`, {
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load the Campaign members (${response.status})`)
  }

  return campaignMembersResponseSchema.parse(await response.json())
}

/** Calls PUT /api/campaigns/{id}/allowed-creation-methods (Keeper only) and returns the updated Campaign. */
export async function changeAllowedCreationMethods(
  accessToken: string,
  campaignId: string,
  allowedCreationMethods: CreationMethod[],
): Promise<Campaign> {
  const response = await fetch(`/api/campaigns/${campaignId}/allowed-creation-methods`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ allowedCreationMethods }),
  })

  if (!response.ok) {
    throw new Error(`Failed to change the creation methods (${response.status})`)
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
