/** The outcome of an Account attempting to join a Campaign through a Campaign Invite. */
export type JoinOutcome =
  | 'Joined'
  | 'AlreadyMember'
  | 'LimitReached'
  | 'InvalidInvite'
  | 'KeeperCannotJoin'

/** The result of a join attempt, with the joined Campaign id when one was joined. */
export interface JoinResult {
  outcome: JoinOutcome
  campaignId: string | null
}
