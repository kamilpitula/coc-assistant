import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'

export type StatusAudience = 'Player' | 'Keeper'

/** Status labels of specs/character-sheet/ux.md section 1. */
const labels: Record<StatusAudience, Record<InvestigatorStatus, string>> = {
  Player: {
    Draft: 'Draft',
    Submitted: 'Submitted - waiting for your Keeper',
    ChangesRequested: 'Changes requested',
    Approved: 'Approved - ready for play',
  },
  Keeper: {
    Draft: 'In progress',
    Submitted: 'Submitted',
    ChangesRequested: 'Changes requested',
    Approved: 'Approved',
  },
}

export function investigatorStatusLabel(status: InvestigatorStatus, audience: StatusAudience): string {
  return labels[audience][status]
}
