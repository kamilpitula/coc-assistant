import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

import { UNNAMED_INVESTIGATOR } from './rosterRows'

/**
 * The Approved Investigators' display names by id (PBI-SPL-003): the client resolves an Item holder's name from the
 * roster, with a missing name as "Unnamed Investigator". Only Visible, Approved Investigators with an id are named.
 */
export function approvedInvestigatorNames(members: CampaignMember[] | null | undefined): Map<string, string> {
  return new Map(
    (members ?? []).flatMap((member) => {
      const investigator = member.investigator
      return investigator?.visibility === 'Visible' && investigator.status === 'Approved' && investigator.id !== undefined
        ? [[investigator.id, investigator.name ?? UNNAMED_INVESTIGATOR] as const]
        : []
    }),
  )
}
