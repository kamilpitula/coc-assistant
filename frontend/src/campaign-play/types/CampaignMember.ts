/** A Campaign Member's role (specs/campaign-play/spec.md, Campaign members API). */
export type CampaignMemberRole = 'Keeper' | 'Player'

/** One roster entry: an opaque memberId, never an Account id, and no Investigator data. */
export interface CampaignMember {
  memberId: string
  displayName: string
  role: CampaignMemberRole
  isYou: boolean
}

/** A Campaign Member's Presence as the server reports it. */
export type MemberPresence = 'Connected' | 'NotConnected'

/** What the roster shows: the member's Presence, or Unknown while this client has no current snapshot. */
export type DisplayedPresence = MemberPresence | 'Unknown'
