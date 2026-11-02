import { authHeaders } from '@/campaign-play/services/authHeaders'
import { cluesSchema } from '@/scene-play/services/revealSchemas'
import type { Clues } from '@/scene-play/types/Reveal'

export const cluesQueryKeys = {
  /** Every Clues query of the Campaign. */
  all: (campaignId: string) => ['campaigns', campaignId, 'clues'] as const,
  /** Every Keeper Clues query of the Campaign. */
  investigators: (campaignId: string) => ['campaigns', campaignId, 'clues', 'investigators'] as const,
  mine: (campaignId: string) => ['campaigns', campaignId, 'clues', 'mine'] as const,
  investigator: (campaignId: string, investigatorId: string) => ['campaigns', campaignId, 'clues', 'investigators', investigatorId] as const,
}

async function readClues(response: Response, description: string): Promise<Clues | null> {
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load ${description} (${response.status})`)
  }

  return cluesSchema.parse(await response.json())
}

/** Calls GET .../investigators/mine/clues (Player only); null when the API answers 404 (no Approved Investigator). */
export async function getMyClues(accessToken: string, campaignId: string): Promise<Clues | null> {
  return readClues(await fetch(`/api/campaigns/${campaignId}/investigators/mine/clues`, { headers: authHeaders(accessToken) }), 'the Clues')
}

/** Calls GET .../investigators/{investigatorId}/clues (Keeper only); null when the API answers 404. */
export async function getInvestigatorClues(accessToken: string, campaignId: string, investigatorId: string): Promise<Clues | null> {
  return readClues(
    await fetch(`/api/campaigns/${campaignId}/investigators/${investigatorId}/clues`, { headers: authHeaders(accessToken) }),
    'the Clues',
  )
}
