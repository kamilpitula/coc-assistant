import { Link } from '@tanstack/react-router'
import { useId, type ReactNode } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { useWallPreview } from '@/campaign-play/hooks/useWallEntries'
import { useWallEntryAnnouncement } from '@/campaign-play/hooks/useWallEntryAnnouncement'
import type { WallEntry } from '@/campaign-play/types/WallEntry'
import { RollRequestCard } from '@/roll-requests/components/roll-request-card/roll-request-card'
import { Badge } from '@/shared/components/ui/badge'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface WallPreviewProps {
  campaignId: string
  /** Optional compose form, rendered between the heading and the entries (PBI-SPL-007: the Active Scene fills it). */
  composer?: ReactNode
}

/** The latest Wall Entries on the overview, with live arrivals announced (specs/campaign-wall/ux.md sections 4.5 and 7). */
export function WallPreview({ campaignId, composer }: WallPreviewProps) {
  const preview = useWallPreview(campaignId)
  const headingId = useId()
  const announcement = useWallEntryAnnouncement(preview.data?.entries, preview.isFetchedAfterMount)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Wall
      </h2>
      {composer}
      <PreviewBody campaignId={campaignId} entries={preview.data?.entries} failed={preview.isError} onRetry={() => void preview.refetch()} />
      {!preview.isPending && !preview.isError && (
        <Link to="/campaigns/$campaignId/wall" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
          Open the Wall
        </Link>
      )}
      <div aria-live="polite" className="sr-only">
        <span key={announcement.sequence}>{announcement.message}</span>
      </div>
    </section>
  )
}

interface PreviewBodyProps {
  campaignId: string
  entries: WallEntry[] | undefined
  failed: boolean
  onRetry: () => void
}

function PreviewBody({ campaignId, entries, failed, onRetry }: PreviewBodyProps) {
  if (failed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load the Wall.</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (!entries) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the Wall yet.</p>
  }

  return (
    <Card>
      <ol className="divide-y overflow-hidden rounded-xl">
        {entries.map((entry) => (
          <PreviewRow key={entry.id} campaignId={campaignId} entry={entry} />
        ))}
      </ol>
    </Card>
  )
}

function PreviewRow({ campaignId, entry }: { campaignId: string; entry: WallEntry }) {
  // A RollRequest entry is its card, never clamped (specs/roll-requests/ux.md section 5).
  if (entry.kind === 'RollRequest' && entry.rollRequestId !== null) {
    return (
      <li className="border-l-4 p-4">
        <RollRequestCard campaignId={campaignId} rollRequestId={entry.rollRequestId} requestedByDisplayName={entry.authorDisplayName} />
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <WallEntryTime createdAt={entry.createdAt} />
        <span className="font-medium break-words">{entry.authorDisplayName}</span>
        {entry.visibility === 'KeeperOnly' && <Badge variant="outline">Keeper only</Badge>}
      </div>
      <p className="line-clamp-3 break-words whitespace-pre-line">{entry.text}</p>
    </li>
  )
}
