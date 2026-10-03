import { useEffect, useRef, useState } from 'react'

import { PresenceIndicator } from '@/campaign-play/components/presence-indicator/presence-indicator'
import { useCampaignMembers } from '@/campaign-play/hooks/useCampaignMembers'
import { useCampaignLiveConnection } from '@/campaign-play/providers/campaignLiveConnectionContext'
import { describePresenceChanges, type PresenceView } from '@/campaign-play/services/presenceAnnouncements'
import { displayedPresenceOf, type CampaignPresenceState } from '@/campaign-play/state/campaignPresenceState'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { Alert } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/components/utils'

const HEADING_ID = 'campaign-presence-heading'
const CHECKING = "Checking who's connected..."

interface CampaignPresenceProps {
  campaignId: string
}

/**
 * "At the table": every Campaign Member with their Presence (specs/campaign-play/ux.md, Option A). The roster loads
 * through REST; only the states wait for the live connection.
 */
export function CampaignPresence({ campaignId }: CampaignPresenceProps) {
  const members = useCampaignMembers(campaignId)
  const { presence, retry } = useCampaignLiveConnection()
  const announcement = usePresenceAnnouncement(members.data ?? undefined, presence.presenceByMember)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const retryPressedRef = useRef(false)

  // When "Try again" disappears, focus moves to the heading so it is never lost (PR-A11Y-6).
  useEffect(() => {
    if (presence.connection !== 'failed' && retryPressedRef.current) {
      retryPressedRef.current = false
      headingRef.current?.focus()
    }
  }, [presence.connection])

  if (members.data === null) {
    return null
  }

  function retryConnection() {
    retryPressedRef.current = true
    retry()
  }

  return (
    <section aria-labelledby={HEADING_ID} className="flex w-full max-w-xl flex-col gap-3">
      <h2 id={HEADING_ID} ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        At the table
      </h2>
      {members.isPending && <RosterLoading />}
      {members.isError && <RosterError onRetry={() => void members.refetch()} />}
      {members.data && (
        <Roster members={members.data} presence={presence} onRetryConnection={retryConnection} />
      )}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </section>
  )
}

function RosterLoading() {
  return (
    <>
      <p className="text-sm text-muted-foreground">{CHECKING}</p>
      <Card aria-busy="true" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-44" />
      </Card>
    </>
  )
}

function RosterError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">We couldn&apos;t load who&apos;s at the table.</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

interface RosterProps {
  members: CampaignMember[]
  presence: CampaignPresenceState
  onRetryConnection: () => void
}

function Roster({ members, presence, onRetryConnection }: RosterProps) {
  const viewerIsKeeper = members.some((member) => member.role === 'Keeper' && member.isYou)

  return (
    <>
      <p className="text-sm text-muted-foreground">{summaryOf(members, presence)}</p>
      <ConnectionNotice connection={presence.connection} onRetry={onRetryConnection} />
      <Card>
        <ul className="divide-y">
          {members.map((member) => (
            <MemberRow key={member.memberId} member={member} presence={presence} />
          ))}
        </ul>
      </Card>
      {viewerIsKeeper && members.length === 1 && (
        <p className="text-sm">No Players yet. Share the Invite to bring them in.</p>
      )}
    </>
  )
}

function summaryOf(members: CampaignMember[], presence: CampaignPresenceState): string {
  if (presence.presenceByMember === null) {
    return CHECKING
  }

  const connected = members.filter((member) => displayedPresenceOf(presence, member.memberId) === 'Connected').length
  return `${connected} of ${members.length} connected`
}

function ConnectionNotice({ connection, onRetry }: { connection: CampaignPresenceState['connection']; onRetry: () => void }) {
  if (connection === 'reconnecting') {
    return (
      <Alert role="status">Connection lost. Reconnecting... Who&apos;s at the table may be out of date.</Alert>
    )
  }

  if (connection === 'failed') {
    return (
      <Alert role="status" className="flex flex-wrap items-center justify-between gap-3">
        <span>Couldn&apos;t reconnect.</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </Alert>
    )
  }

  return null
}

function MemberRow({ member, presence }: { member: CampaignMember; presence: CampaignPresenceState }) {
  const displayed = displayedPresenceOf(presence, member.memberId)

  return (
    <li className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className={cn('break-words', displayed === 'Unknown' && 'text-muted-foreground')}>
          {member.displayName}
          {member.isYou ? ' (you)' : ''}
        </span>
        {member.role === 'Keeper' && <Badge variant="outline">Keeper</Badge>}
      </span>
      <PresenceIndicator presence={displayed} />
    </li>
  )
}

interface AnnouncementTracking {
  view: PresenceView
  hadSnapshot: boolean
  announcement: string
}

/**
 * The text of the polite live region (ux.md section 6). It is derived while rendering from the previous roster and
 * Presence, so changes that arrive together are announced in one message.
 */
function usePresenceAnnouncement(
  members: CampaignMember[] | undefined,
  presenceByMember: CampaignPresenceState['presenceByMember'],
): string {
  const [tracking, setTracking] = useState<AnnouncementTracking>({
    view: { members, presenceByMember },
    hadSnapshot: presenceByMember !== null,
    announcement: '',
  })

  if (tracking.view.members !== members || tracking.view.presenceByMember !== presenceByMember) {
    const next = { members, presenceByMember }
    const messages = describePresenceChanges(tracking.view, next, { hadSnapshotBefore: tracking.hadSnapshot })
    setTracking({
      view: next,
      hadSnapshot: tracking.hadSnapshot || presenceByMember !== null,
      announcement: messages.length > 0 ? messages.join(' ') : tracking.announcement,
    })
  }

  return tracking.announcement
}
