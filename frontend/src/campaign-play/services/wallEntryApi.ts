import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import {
  WALL_ENTRY_VISIBILITIES,
  type NewWallEntry,
  type WallEntry,
  type WallEntryPage,
} from '@/campaign-play/types/WallEntry'

// Strict, so a field the contract does not name is rejected instead of silently passed on.
const wallEntrySchema = z.strictObject({
  id: z.string(),
  text: z.string(),
  visibility: z.enum(WALL_ENTRY_VISIBILITIES),
  createdAt: z.string(),
  authorDisplayName: z.string(),
})

const wallEntryPageSchema = z.strictObject({
  entries: z.array(wallEntrySchema),
  nextCursor: z.string().nullable(),
})

interface WallEntryQuery {
  limit?: number
  cursor?: string
}

function wallEntriesUrl(campaignId: string, query: WallEntryQuery = {}): string {
  const params = new URLSearchParams()
  if (query.limit !== undefined) {
    params.set('limit', String(query.limit))
  }
  if (query.cursor !== undefined) {
    params.set('cursor', query.cursor)
  }
  const queryString = params.toString()
  return `/api/campaigns/${campaignId}/wall-entries${queryString === '' ? '' : `?${queryString}`}`
}

/** Calls GET /api/campaigns/{id}/wall-entries: the newest entries this caller may read (specs/campaign-play/spec.md). */
export async function getWallEntries(
  accessToken: string,
  campaignId: string,
  query: WallEntryQuery = {},
): Promise<WallEntryPage> {
  const response = await fetch(wallEntriesUrl(campaignId, query), { headers: authHeaders(accessToken) })

  if (!response.ok) {
    throw new Error(`Failed to load the Wall (${response.status})`)
  }

  return wallEntryPageSchema.parse(await response.json())
}

/** Calls POST /api/campaigns/{id}/wall-entries and returns the created entry. */
export async function addWallEntry(accessToken: string, campaignId: string, entry: NewWallEntry): Promise<WallEntry> {
  const response = await fetch(wallEntriesUrl(campaignId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(entry),
  })

  if (!response.ok) {
    throw new Error(`Failed to add the Wall Entry (${response.status})`)
  }

  return wallEntrySchema.parse(await response.json())
}

/** Calls DELETE /api/campaigns/{id}/wall-entries/{entryId} (Keeper only); an entry that is already gone counts as removed. */
export async function removeWallEntry(accessToken: string, campaignId: string, entryId: string): Promise<void> {
  const response = await fetch(`${wallEntriesUrl(campaignId)}/${entryId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to remove the Wall Entry (${response.status})`)
  }
}
