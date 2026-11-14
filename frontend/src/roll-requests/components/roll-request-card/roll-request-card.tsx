import { Check, X } from 'lucide-react'
import { useId } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { useRollRequest } from '@/roll-requests/hooks/useRollRequests'
import { describeDice, describeFaces, describeOutcome, describeTargets, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import type { CompletedRoll, RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface RollRequestCardProps {
  campaignId: string
  rollRequestId: string
  /** The Wall Entry's author: only the Keeper can request a roll, so this is the Keeper's display name. */
  requestedByDisplayName: string
}

/**
 * A Roll Request's card (specs/roll-requests/ux.md section 5): the same component on the Wall page and in the preview,
 * never clamped and with no actions. The card reads the Roll Request itself; the Wall Entry carries only its id.
 */
export function RollRequestCard({ campaignId, rollRequestId, requestedByDisplayName }: RollRequestCardProps) {
  const request = useRollRequest(campaignId, rollRequestId)
  const headingId = useId()

  if (request.data === null) {
    return null
  }

  if (request.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm">We couldn&apos;t load this roll.</p>
        <Button type="button" variant="outline" onClick={() => void request.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (request.isPending || !request.data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    )
  }

  const hidden = request.data.visibility === 'KeeperOnly'

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-2">
      <CardHeader request={request.data} headingId={headingId} requestedByDisplayName={requestedByDisplayName} />
      <ul className="flex flex-col gap-2">
        {request.data.requestedRolls.map((roll) => (
          <RequestedRollRow key={roll.investigatorId} roll={roll} hidden={hidden} />
        ))}
      </ul>
    </article>
  )
}

function CardHeader({ request, headingId, requestedByDisplayName }: { request: RollRequest; headingId: string; requestedByDisplayName: string }) {
  const title = `${rollTargetName(request.target)} roll`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="text-base font-semibold break-words">
          {title}
        </h3>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <WallEntryTime createdAt={request.createdAt} />
          <span className="font-medium break-words">{requestedByDisplayName}</span>
          {request.visibility === 'KeeperOnly' && <Badge variant="outline">Keeper only</Badge>}
        </span>
      </div>
      {request.message !== null && request.message !== '' && (
        <p className="break-words whitespace-pre-line">{request.message}</p>
      )}
    </div>
  )
}

function RequestedRollRow({ roll, hidden }: { roll: RequestedRoll; hidden: boolean }) {
  const result = roll.rolls[0]

  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold break-words">{roll.investigatorName ?? 'Unnamed Investigator'}</span>
        <span className="ml-auto">
          <RollStatus roll={roll} result={result} />
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {roll.difficulty} . {describeDice(roll.bonusDice, roll.penaltyDice)} . target {describeTargets(roll.targetValue)}
        {roll.usesBaseValue && ' (base value)'}
      </p>
      {result?.percentile && <p className="text-sm">{describeFaces(result.percentile)}</p>}
      {result?.rolledBy && <p className="text-sm">Rolled by {result.rolledBy}{hidden ? ' (hidden roll)' : ''}</p>}
      {result?.earnsExperienceCheck === true && <p className="text-sm text-success">Experience check earned</p>}
    </li>
  )
}

function RollStatus({ roll, result }: { roll: RequestedRoll; result: CompletedRoll | undefined }) {
  if (roll.status === 'Waiting' || !result?.percentile) {
    if (roll.status === 'Waiting') {
      return <span className="text-warning">Waiting</span>
    }

    return <span>{result?.result}</span>
  }

  const outcome = describeOutcome(result.percentile.successLevel, result.percentile.isSuccess, roll.difficulty)
  return result.percentile.isSuccess ? (
    <span className="inline-flex items-center gap-1">
      <Check aria-hidden="true" className="size-4" />
      {result.percentile.result}: {outcome}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <X aria-hidden="true" className="size-4" />
      {result.percentile.result}: {outcome}
    </span>
  )
}
