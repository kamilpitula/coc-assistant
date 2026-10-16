import { useState } from 'react'

import { WALL_COMPOSER_TEXT_ID, WallEntryComposer } from '@/campaign-play/components/wall-entry-composer/wall-entry-composer'
import { WallEntryList } from '@/campaign-play/components/wall-entry-list/wall-entry-list'
import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { useAddWallEntry, useRemoveWallEntry, useWallEntries } from '@/campaign-play/hooks/useWallEntries'
import type { NewWallEntry } from '@/campaign-play/types/WallEntry'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface CampaignWallProps {
  campaignId: string
}

/**
 * The Campaign Wall page (specs/campaign-wall/ux.md): the compose box, then the entries newest first. The layout route
 * renders the Campaign header and handles a missing Campaign, so the Campaign is already in the query cache here.
 */
export function CampaignWall({ campaignId }: CampaignWallProps) {
  const campaign = useCampaign(campaignId)
  const wall = useWallEntries(campaignId)
  const addEntry = useAddWallEntry(campaignId)
  const removeEntry = useRemoveWallEntry(campaignId)
  const [status, setStatus] = useState('')
  const [addFailed, setAddFailed] = useState(false)

  if (!campaign.data) {
    return null
  }

  const add = async (entry: NewWallEntry) => {
    setAddFailed(false)
    try {
      await addEntry.mutateAsync(entry)
      setStatus('Wall Entry added.')
      return true
    } catch {
      setAddFailed(true)
      return false
    }
  }

  const remove = async (entryId: string) => {
    try {
      await removeEntry.mutateAsync(entryId)
      setStatus('Wall Entry removed.')
      return true
    } catch {
      return false
    }
  }

  const entries = wall.data?.pages.flatMap((page) => page.entries)

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Wall</h1>
      <WallEntryComposer viewerRole={campaign.data.role} pending={addEntry.isPending} failed={addFailed} onSubmit={add} />
      <p role="status" className="text-sm empty:hidden">
        {status}
      </p>
      {entries ? (
        <Entries
          entries={entries}
          viewerRole={campaign.data.role}
          onRemove={remove}
          olderEntries={{
            hasMore: wall.hasNextPage,
            loading: wall.isFetchingNextPage,
            failed: wall.isFetchNextPageError,
            load: () => void wall.fetchNextPage(),
          }}
        />
      ) : (
        <LoadingOrError failed={wall.isError} onRetry={() => void wall.refetch()} />
      )}
    </div>
  )
}

interface OlderEntries {
  hasMore: boolean
  loading: boolean
  failed: boolean
  load: () => void
}

interface EntriesProps {
  entries: React.ComponentProps<typeof WallEntryList>['entries']
  viewerRole: React.ComponentProps<typeof WallEntryList>['viewerRole']
  onRemove: React.ComponentProps<typeof WallEntryList>['onRemove']
  olderEntries: OlderEntries
}

function Entries({ entries, viewerRole, onRemove, olderEntries }: EntriesProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on the Wall yet.</p>
  }

  return (
    <>
      <WallEntryList entries={entries} viewerRole={viewerRole} fallbackFocusId={WALL_COMPOSER_TEXT_ID} onRemove={onRemove} />
      {olderEntries.failed && (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t load older entries.
        </p>
      )}
      {olderEntries.hasMore && (
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          disabled={olderEntries.loading}
          onClick={olderEntries.load}
        >
          {olderEntries.loading ? 'Loading...' : olderEntries.failed ? 'Try again' : 'Show older entries'}
        </Button>
      )}
    </>
  )
}

interface LoadingOrErrorProps {
  failed: boolean
  onRetry: () => void
}

function LoadingOrError({ failed, onRetry }: LoadingOrErrorProps) {
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

  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
