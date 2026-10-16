import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

import { InvestigatorStatusBadge } from '@/campaign-play/components/investigator-status-badge/investigator-status-badge'
import { InvitePlayersDialog } from '@/campaign-play/components/invite-dialog/invite-dialog'
import { PresenceIndicator } from '@/campaign-play/components/presence-indicator/presence-indicator'
import { useCampaignMembers } from '@/campaign-play/hooks/useCampaignMembers'
import { useInvestigatorAnnouncement } from '@/campaign-play/hooks/useInvestigatorAnnouncement'
import { useCampaignLiveConnection } from '@/campaign-play/providers/campaignLiveConnectionContext'
import { describePresenceChanges, type PresenceView } from '@/campaign-play/services/presenceAnnouncements'
import { investigatorCellsFor, type InvestigatorCells, type RosterRowAction } from '@/campaign-play/services/rosterRows'
import { displayedPresenceOf, type CampaignPresenceState } from '@/campaign-play/state/campaignPresenceState'
import type { CampaignMember, CampaignMemberRole } from '@/campaign-play/types/CampaignMember'
import { Alert } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { cn } from '@/shared/components/utils'

const CHECKING = "Checking who's connected..."

interface CampaignTableProps {
  campaignId: string
}

/**
 * "At the table": every Campaign Member with their Presence and the Investigator the viewer may see
 * (specs/campaign-overview/ux.md section 5). Presence summary, notice, and announcements follow
 * specs/campaign-play/ux.md sections 2, 4, and 6. The roster loads through REST; only the states wait for the live
 * connection.
 */
export function CampaignTable({ campaignId }: CampaignTableProps) {
  const headingId = useId()
  const members = useCampaignMembers(campaignId)
  const { presence, retry } = useCampaignLiveConnection()
  const roster = members.data ?? undefined
  const announcement = usePresenceAnnouncement(roster, presence.presenceByMember)
  const investigatorAnnouncement = useInvestigatorAnnouncement(roster, members.isFetchedAfterMount)
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

  const viewerIsKeeper = members.data?.some((member) => member.role === 'Keeper' && member.isYou) ?? false

  return (
    <section aria-labelledby={headingId} className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          At the table
        </h2>
        {viewerIsKeeper && <InvitePlayersDialog campaignId={campaignId} variant="outline" />}
      </div>
      {members.isPending && <RosterLoading />}
      {members.isError && <RosterError onRetry={() => void members.refetch()} />}
      {members.data && (
        <Roster
          campaignId={campaignId}
          members={members.data}
          viewer={viewerIsKeeper ? 'Keeper' : 'Player'}
          presence={presence}
          onRetryConnection={retryConnection}
        />
      )}
      <div aria-live="polite" className="sr-only">
        <p>{announcement}</p>
        <p>{investigatorAnnouncement}</p>
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
  campaignId: string
  members: CampaignMember[]
  viewer: CampaignMemberRole
  presence: CampaignPresenceState
  onRetryConnection: () => void
}

/** A table from 640px and a list below it (CO-A11Y-3); rows keep the server order (CO-UX-7). */
function Roster({ campaignId, members, viewer, presence, onRetryConnection }: RosterProps) {
  const rows = members.map((member) => ({
    member,
    presence: displayedPresenceOf(presence, member.memberId),
    cells: investigatorCellsFor(member, viewer),
  }))

  return (
    <>
      <p className="text-sm text-muted-foreground">{summaryOf(members, presence)}</p>
      <ConnectionNotice connection={presence.connection} onRetry={onRetryConnection} />
      <Card className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Member</TableHead>
              <TableHead scope="col">Presence</TableHead>
              <TableHead scope="col">Investigator</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="sr-only">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ member, presence: displayed, cells }) => (
              <TableRow key={member.memberId} className={cn(member.isYou && 'bg-muted')}>
                <TableCell>
                  <MemberName member={member} unknown={displayed === 'Unknown'} />
                </TableCell>
                <TableCell>
                  <PresenceIndicator presence={displayed} />
                </TableCell>
                <TableCell>
                  <InvestigatorText cells={cells} />
                </TableCell>
                <TableCell>
                  <StatusCell cells={cells} />
                </TableCell>
                <TableCell>{cells.action && <RowActionLink campaignId={campaignId} action={cells.action} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="sm:hidden">
        <ul className="divide-y">
          {rows.map(({ member, presence: displayed, cells }) => (
            <li key={member.memberId} className={cn('flex flex-col gap-2 px-4 py-3', member.isYou && 'bg-muted')}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <MemberName member={member} unknown={displayed === 'Unknown'} />
                <PresenceIndicator presence={displayed} />
              </div>
              {member.role === 'Player' && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <InvestigatorText cells={cells} />
                    {cells.status && <InvestigatorStatusBadge status={cells.status.status} audience={cells.status.audience} />}
                  </div>
                  {cells.action && <RowActionLink campaignId={campaignId} action={cells.action} />}
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

function MemberName({ member, unknown }: { member: CampaignMember; unknown: boolean }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <span className={cn('break-words', unknown && 'text-muted-foreground')}>
        {member.displayName}
        {member.isYou ? ' (you)' : ''}
      </span>
      {member.role === 'Keeper' && <Badge variant="outline">Keeper</Badge>}
    </span>
  )
}

function None() {
  return (
    <>
      <span aria-hidden="true">-</span>
      <span className="sr-only">None</span>
    </>
  )
}

function InvestigatorText({ cells }: { cells: InvestigatorCells }) {
  if (cells.investigator === null) {
    return <None />
  }

  return (
    <span className={cn('break-words', cells.investigator.muted && 'text-muted-foreground')}>{cells.investigator.text}</span>
  )
}

function StatusCell({ cells }: { cells: InvestigatorCells }) {
  return cells.status ? <InvestigatorStatusBadge status={cells.status.status} audience={cells.status.audience} /> : <None />
}

/** A row action with the Investigator name as visually hidden context (CO-A11Y-4). */
function RowActionLink({ campaignId, action }: { campaignId: string; action: RosterRowAction }) {
  const className = 'inline-flex min-h-6 items-center self-start underline underline-offset-4'
  const label = (
    <>
      {action.label} <span className="sr-only">{action.investigatorName}</span>
    </>
  )

  if (action.to === 'review') {
    return (
      <Link
        to="/campaigns/$campaignId/investigators/$investigatorId"
        params={{ campaignId, investigatorId: action.investigatorId }}
        className={className}
      >
        {label}
      </Link>
    )
  }

  if (action.to === 'mineSheet') {
    return (
      <Link to="/campaigns/$campaignId/investigator/$step" params={{ campaignId, step: 'sheet' }} className={className}>
        {label}
      </Link>
    )
  }

  return (
    <Link to="/campaigns/$campaignId/investigator" params={{ campaignId }} className={className}>
      {label}
    </Link>
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
    return <Alert role="status">Connection lost. Reconnecting... Who&apos;s at the table may be out of date.</Alert>
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

interface AnnouncementTracking {
  view: PresenceView
  hadSnapshot: boolean
  announcement: string
}

/**
 * The text of the polite live region (campaign-play ux.md section 6). It is derived while rendering from the previous
 * roster and Presence, so changes that arrive together are announced in one message.
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
