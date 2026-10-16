import { UNNAMED_INVESTIGATOR } from '@/campaign-play/services/rosterRows'
import type { CampaignMember, RosterInvestigator } from '@/campaign-play/types/CampaignMember'
import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'

/** The status of a row's Investigator, or null when the viewer sees none or no status (Draft hidden, not ready). */
function statusOf(investigator: RosterInvestigator | null): InvestigatorStatus | null {
  return investigator?.visibility === 'Visible' ? investigator.status : null
}

function nameOf(investigator: RosterInvestigator | null): string {
  return investigator?.visibility === 'Visible' && investigator.name !== null ? investigator.name : UNNAMED_INVESTIGATOR
}

function describeOwnChange(after: InvestigatorStatus | null, before: InvestigatorStatus | null): string[] {
  if (after === before) {
    return []
  }

  if (after === 'Approved') {
    return ['Your Investigator was approved.']
  }

  return after === 'ChangesRequested' ? ['Your Keeper asked for changes.'] : []
}

function describeMemberChange(previous: CampaignMember, next: CampaignMember, viewerIsKeeper: boolean): string[] {
  const before = statusOf(previous.investigator)
  const after = statusOf(next.investigator)
  if (next.isYou) {
    return describeOwnChange(after, before)
  }

  if (viewerIsKeeper) {
    return after === 'Submitted' && before !== 'Submitted'
      ? [`${nameOf(next.investigator)} by ${next.displayName} was submitted.`]
      : []
  }

  return after === 'Approved' && before !== 'Approved' ? [`${nameOf(next.investigator)} is ready for play.`] : []
}

/**
 * The screen-reader announcements for Investigator changes between two rosters (specs/campaign-overview/ux.md section
 * 5.2, "Live Investigator details"). Nothing is announced before the first roster fetch, for the Keeper's own review
 * decisions, or for a Draft started or abandoned. Changes found together are listed in roster order.
 */
export function describeInvestigatorChanges(
  previous: readonly CampaignMember[] | undefined,
  next: readonly CampaignMember[] | undefined,
): string[] {
  if (previous === undefined || next === undefined) {
    return []
  }

  const previousById = new Map(previous.map((member) => [member.memberId, member]))
  const viewerIsKeeper = next.some((member) => member.isYou && member.role === 'Keeper')
  return next.flatMap((member) => {
    const before = previousById.get(member.memberId)
    return before === undefined || member.role === 'Keeper' ? [] : describeMemberChange(before, member, viewerIsKeeper)
  })
}
