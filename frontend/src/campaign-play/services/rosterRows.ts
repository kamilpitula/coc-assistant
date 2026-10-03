import type { StatusAudience } from '@/campaign-play/services/investigatorStatusLabels'
import type { CampaignMember, CampaignMemberRole, RosterInvestigator } from '@/campaign-play/types/CampaignMember'
import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'

export const HIDDEN_DRAFT_NAME = 'Not shown until submitted'
export const UNNAMED_INVESTIGATOR = 'Unnamed Investigator'

/** Where a row action leads: the Keeper's review page, or the Player's own Investigator (sheet step for edits). */
export type RosterRowAction =
  | { label: 'Review' | 'View'; to: 'review'; investigatorId: string; investigatorName: string }
  | { label: 'Continue' | 'View'; to: 'mine'; investigatorName: string }
  | { label: 'Edit Investigator'; to: 'mineSheet'; investigatorName: string }

/** What a row shows in its Investigator, Status, and Action cells; null renders as "-" or nothing. */
export interface InvestigatorCells {
  investigator: { text: string; muted: boolean } | null
  status: { status: InvestigatorStatus; audience: StatusAudience } | null
  action: RosterRowAction | null
}

type VisibleInvestigator = Extract<RosterInvestigator, { visibility: 'Visible' }>

const EMPTY: InvestigatorCells = { investigator: null, status: null, action: null }

function muted(text: string): InvestigatorCells {
  return { investigator: { text, muted: true }, status: null, action: null }
}

/** The cells of one "At the table" row for the viewer (specs/campaign-overview/ux.md section 5.1). */
export function investigatorCellsFor(member: CampaignMember, viewer: CampaignMemberRole): InvestigatorCells {
  const investigator = member.investigator
  if (member.role === 'Keeper') {
    return EMPTY
  }

  if (investigator === null) {
    return muted('No Investigator yet')
  }

  if (investigator.visibility === 'InProgress') {
    return { ...muted(HIDDEN_DRAFT_NAME), status: { status: 'Draft', audience: 'Keeper' } }
  }

  if (investigator.visibility === 'NotReady') {
    return muted('Not ready yet')
  }

  return visibleCells(investigator, viewer, member.isYou)
}

function visibleCells(investigator: VisibleInvestigator, viewer: CampaignMemberRole, isOwn: boolean): InvestigatorCells {
  const name = investigator.name ?? UNNAMED_INVESTIGATOR
  const shown = { investigator: { text: name, muted: false } }
  if (viewer === 'Keeper') {
    return { ...shown, status: { status: investigator.status, audience: 'Keeper' }, action: keeperAction(investigator, name) }
  }

  // Another Player's Investigator is visible only once Approved; it reads "Approved" and cannot be opened (D3).
  if (!isOwn) {
    return { ...shown, status: { status: investigator.status, audience: 'Keeper' }, action: null }
  }

  return { ...shown, status: { status: investigator.status, audience: 'Player' }, action: ownAction(investigator.status, name) }
}

function keeperAction(investigator: VisibleInvestigator, investigatorName: string): RosterRowAction | null {
  if (investigator.id === undefined) {
    return null
  }

  const label = investigator.status === 'Submitted' ? 'Review' : 'View'
  return { label, to: 'review', investigatorId: investigator.id, investigatorName }
}

function ownAction(status: InvestigatorStatus, investigatorName: string): RosterRowAction {
  if (status === 'ChangesRequested') {
    return { label: 'Edit Investigator', to: 'mineSheet', investigatorName }
  }

  return { label: status === 'Draft' ? 'Continue' : 'View', to: 'mine', investigatorName }
}
