import type { CampaignMember, MemberPresence } from '@/campaign-play/types/CampaignMember'

/** The roster and this client's Presence states at one moment. */
export interface PresenceView {
  members: CampaignMember[] | undefined
  presenceByMember: Readonly<Record<string, MemberPresence>> | null
}

/**
 * The screen-reader announcements for a change between two moments (specs/campaign-play/ux.md section 6). The first
 * snapshot and your own connection are not announced; a Player new to the roster is announced as joining. Changes
 * that arrive together are listed in roster order.
 */
export function describePresenceChanges(
  previous: PresenceView,
  next: PresenceView,
  context: { hadSnapshotBefore: boolean },
): string[] {
  if (previous.presenceByMember === null && next.presenceByMember !== null) {
    return context.hadSnapshotBefore ? ['Reconnected.'] : []
  }

  const previousIds = new Set((previous.members ?? []).map((member) => member.memberId))
  const rosterLoadedBefore = previous.members !== undefined
  return (next.members ?? [])
    .filter((member) => !member.isYou)
    .flatMap((member) => {
      if (!previousIds.has(member.memberId)) {
        return rosterLoadedBefore ? [`${member.displayName} joined the Campaign.`] : []
      }

      return describeMemberChange(member, previous.presenceByMember, next.presenceByMember)
    })
}

function describeMemberChange(
  member: CampaignMember,
  previous: PresenceView['presenceByMember'],
  next: PresenceView['presenceByMember'],
): string[] {
  if (previous === null || next === null) {
    return []
  }

  const before = previous[member.memberId] ?? 'NotConnected'
  const after = next[member.memberId] ?? 'NotConnected'
  if (before === after) {
    return []
  }

  return [after === 'Connected' ? `${member.displayName} connected.` : `${member.displayName} disconnected.`]
}
