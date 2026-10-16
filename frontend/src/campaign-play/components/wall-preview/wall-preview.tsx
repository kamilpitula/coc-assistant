import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { useWallPreview } from '@/campaign-play/hooks/useWallEntries'
import type { WallEntry } from '@/campaign-play/types/WallEntry'
import { Badge } from '@/shared/components/ui/badge'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface WallPreviewProps {
  campaignId: string
}

/** The latest Wall Entries on the overview, read-only (specs/campaign-wall/ux.md section 7). */
export function WallPreview({ campaignId }: WallPreviewProps) {
  const preview = useWallPreview(campaignId)
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Wall
      </h2>
      <PreviewBody entries={preview.data?.entries} failed={preview.isError} onRetry={() => void preview.refetch()} />
      {!preview.isPending && !preview.isError && (
        <Link to="/campaigns/$campaignId/wall" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
          Open the Wall
        </Link>
      )}
    </section>
  )
}

interface PreviewBodyProps {
  entries: WallEntry[] | undefined
  failed: boolean
  onRetry: () => void
}

function PreviewBody({ entries, failed, onRetry }: PreviewBodyProps) {
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
      <ol className="divide-y">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-1 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <WallEntryTime createdAt={entry.createdAt} />
              <span className="font-medium break-words">{entry.authorDisplayName}</span>
              {entry.visibility === 'KeeperOnly' && <Badge variant="outline">Keeper only</Badge>}
            </div>
            <p className="line-clamp-3 break-words whitespace-pre-line">{entry.text}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}
