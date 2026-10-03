import { z } from 'zod'

// The Campaign hub's messages (specs/campaign-play/spec.md, Live connection contract), validated at the boundary.
// A message that does not match is ignored rather than trusted.

const memberPresenceSchema = z.enum(['Connected', 'NotConnected'])

const presenceSnapshotSchema = z.object({
  campaignId: z.string(),
  members: z.array(z.object({ memberId: z.string(), presence: memberPresenceSchema })),
})

const presenceChangedSchema = z.object({
  campaignId: z.string(),
  memberId: z.string(),
  presence: memberPresenceSchema,
})

const campaignDataChangedSchema = z.object({
  campaignId: z.string(),
  topics: z.array(z.string()),
})

export type PresenceSnapshot = z.infer<typeof presenceSnapshotSchema>
export type PresenceChanged = z.infer<typeof presenceChangedSchema>
export type CampaignDataChanged = z.infer<typeof campaignDataChangedSchema>

export function parsePresenceSnapshot(payload: unknown): PresenceSnapshot | null {
  return presenceSnapshotSchema.safeParse(payload).data ?? null
}

export function parsePresenceChanged(payload: unknown): PresenceChanged | null {
  return presenceChangedSchema.safeParse(payload).data ?? null
}

export function parseCampaignDataChanged(payload: unknown): CampaignDataChanged | null {
  return campaignDataChangedSchema.safeParse(payload).data ?? null
}
