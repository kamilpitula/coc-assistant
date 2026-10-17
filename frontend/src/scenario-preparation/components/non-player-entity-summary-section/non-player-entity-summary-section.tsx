import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { useNonPlayerEntities } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { describeCounts } from '@/scenario-preparation/services/nonPlayerEntityFilter'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface NonPlayerEntitySummarySectionProps {
  campaignId: string
}

/**
 * The Keeper's "Non-Player Entities" section on the Overview: the counts sentence, "View all Non-Player Entities",
 * and "Create" (specs/scenario-preparation/ux.md section 22). Mounted for the Keeper only, so a Player's client never
 * requests the list.
 */
export function NonPlayerEntitySummarySection({ campaignId }: NonPlayerEntitySummarySectionProps) {
  const headingId = useId()
  const list = useNonPlayerEntities(campaignId, true)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          Non-Player Entities
        </h2>
        <Link to="/campaigns/$campaignId/non-player-entities/new" params={{ campaignId }} className={buttonVariants({ size: 'sm' })}>
          Create <span className="sr-only">Non-Player Entity</span>
        </Link>
      </div>
      <SummaryBody
        campaignId={campaignId}
        items={list.data}
        isPending={list.isPending}
        isError={list.isError}
        onRetry={() => void list.refetch()}
      />
    </section>
  )
}

interface SummaryBodyProps {
  campaignId: string
  items: NonPlayerEntitySummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

function SummaryBody({ campaignId, items, isPending, isError, onRetry }: SummaryBodyProps) {
  if (isPending) {
    return <Skeleton aria-busy="true" className="h-5 w-full max-w-sm" />
  }

  if (isError || !items) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">We couldn&apos;t load the Non-Player Entities.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No Non-Player Entities yet.</p>
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <p className="text-sm">{describeCounts(items)}</p>
      <Link
        to="/campaigns/$campaignId/non-player-entities"
        params={{ campaignId }}
        className={buttonVariants({ variant: 'link', className: 'px-0' })}
      >
        View all Non-Player Entities
      </Link>
    </div>
  )
}
