import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'

/** A Campaign Member's role (specs/campaign-play/spec.md, Campaign members API). */
export type CampaignMemberRole = 'Keeper' | 'Player'

/**
 * A member's Investigator as the server projects it for the caller (specs/campaign-overview/spec.md, Roster with
 * Investigators). The client never filters it further.
 */
export type RosterInvestigator =
  | { visibility: 'Visible'; id?: string; name: string | null; status: InvestigatorStatus }
  | { visibility: 'InProgress' }
  | { visibility: 'NotReady' }

/** One roster entry: an opaque memberId, never an Account id, and only the Investigator data the caller may see. */
export interface CampaignMember {
  memberId: string
  displayName: string
  role: CampaignMemberRole
  isYou: boolean
  investigator: RosterInvestigator | null
}

/** A Campaign Member's Presence as the server reports it. */
export type MemberPresence = 'Connected' | 'NotConnected'

/** What the roster shows: the member's Presence, or Unknown while this client has no current snapshot. */
export type DisplayedPresence = MemberPresence | 'Unknown'
