import type { InvestigatorListItem, InvestigatorStatus } from '@/campaign-play/types/Investigator'

const statusOrder: Record<InvestigatorStatus, number> = {
  Submitted: 0,
  ChangesRequested: 1,
  Approved: 2,
  Draft: 3,
}

/** The Keeper's list order (specs/character-sheet/ux.md section 3.1): by status, then oldest update first. */
export function inReviewOrder(items: readonly InvestigatorListItem[]): InvestigatorListItem[] {
  return [...items].sort(
    (first, second) =>
      statusOrder[first.status] - statusOrder[second.status] || first.updatedAt.localeCompare(second.updatedAt),
  )
}
