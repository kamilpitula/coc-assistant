import { Check, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { useRollRequest } from '@/roll-requests/hooks/useRollRequests'
import { describeDice, describeFaces, describeOutcome, describeTargets, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import { requestedRollPushState, type RequestedRollPushState } from '@/roll-requests/services/requestedRollPushState'
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
 * A Roll Request's card rendered from data (specs/roll-requests/ux.md section 18): the article of section 5, with no
 * loading of its own. The history renders this view; the Wall renders RollRequestCard, which loads by id.
 */
export function RollRequestCardView({
  request,
  requestedByDisplayName,
}: {
  request: RollRequest
  requestedByDisplayName: string
}) {
  const headingId = useId()
  const hidden = request.visibility === 'KeeperOnly'

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-2">
      <CardHeader request={request} headingId={headingId} requestedByDisplayName={requestedByDisplayName} />
      <ul className="flex flex-col gap-2">
        {request.requestedRolls.map((roll) => (
          <RequestedRollRow key={roll.investigatorId} roll={roll} hidden={hidden} />
        ))}
      </ul>
    </article>
  )
}

/**
 * A Roll Request's card (specs/roll-requests/ux.md section 5): the same component on the Wall page and in the preview,
 * never clamped and with no actions. The card reads the Roll Request itself; the Wall Entry carries only its id.
 */
export function RollRequestCard({ campaignId, rollRequestId, requestedByDisplayName }: RollRequestCardProps) {
  const request = useRollRequest(campaignId, rollRequestId)

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

  return <RollRequestCardView request={request.data} requestedByDisplayName={requestedByDisplayName} />
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
  // Strategy from the client push state (specs/roll-requests/ux.md section 19.3): push rows render their
  // justification and both results; every other row renders as before.
  const state = requestedRollPushState(roll)
  const pushView: Partial<Record<RequestedRollPushState, ReactNode>> = {
    PushAsked: <PushAskedRow roll={roll} hidden={hidden} />,
    Pushed: <PushedRow roll={roll} hidden={hidden} />,
    PushedRolled: <PushedRolledRow roll={roll} hidden={hidden} />,
    PushDeclined: <PushDeclinedRow roll={roll} hidden={hidden} />,
    CancelledAfterPush: <CancelledAfterPushRow roll={roll} hidden={hidden} />,
  }
  return pushView[state] ?? <PlainRequestedRollRow roll={roll} hidden={hidden} />
}

function PlainRequestedRollRow({ roll, hidden }: { roll: RequestedRoll; hidden: boolean }) {
  const result = roll.rolls[0]

  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold break-words">{roll.investigatorName ?? 'Unnamed Investigator'}</span>
        <span className="ml-auto">
          <RollStatus roll={roll} result={result} />
        </span>
      </div>
      {targetLine(roll)}
      {result?.percentile && <p className="text-sm">{describeFaces(result.percentile)}</p>}
      {result?.rolledBy && <p className="text-sm">Rolled by {result.rolledBy}{hidden ? ' (hidden roll)' : ''}</p>}
      {result?.earnsExperienceCheck === true && <p className="text-sm text-success">Experience check earned</p>}
    </li>
  )
}

function RollStatus({ roll, result }: { roll: RequestedRoll; result: CompletedRoll | undefined }) {
  if (roll.status === 'Cancelled') {
    return <span className="text-muted-foreground">Cancelled</span>
  }

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

/** The first result's record of a pushed or declined row; the pushed roll's record is found by its marker. */
function firstRecord(roll: RequestedRoll): CompletedRoll | undefined {
  return roll.rolls.find((record) => !record.isPushed) ?? roll.rolls[0]
}

function pushedRecord(roll: RequestedRoll): CompletedRoll | undefined {
  return roll.rolls.find((record) => record.isPushed)
}

function pushDiceLine(roll: RequestedRoll): string {
  return `Pushed roll: ${roll.difficulty} . ${describeDice(roll.pushBonusDice ?? roll.bonusDice, roll.pushPenaltyDice ?? roll.penaltyDice)}`
}

function recordLines(record: CompletedRoll | undefined, hidden: boolean) {
  return (
    <>
      {record?.percentile && <p className="text-sm">{describeFaces(record.percentile)}</p>}
      {record?.rolledBy && <p className="text-sm">Rolled by {record.rolledBy}{hidden ? ' (hidden roll)' : ''}</p>}
      {record?.earnsExperienceCheck === true && <p className="text-sm text-success">Experience check earned</p>}
    </>
  )
}

function justificationLine(roll: RequestedRoll) {
  return <p className="text-sm break-words whitespace-pre-line">Push justification: &quot;{roll.pushJustification}&quot;</p>
}

function rowHeader(name: string, status: ReactNode) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-bold break-words">{name}</span>
      <span className="ml-auto">{status}</span>
    </div>
  )
}

function targetLine(roll: RequestedRoll) {
  return (
    <p className="text-sm text-muted-foreground">
      {roll.difficulty} . {describeDice(roll.bonusDice, roll.penaltyDice)} . target {describeTargets(roll.targetValue)}
      {roll.usesBaseValue && ' (base value)'}
    </p>
  )
}

function PushAskedRow({ roll, hidden }: { roll: RequestedRoll; hidden: boolean }) {
  const result = firstRecord(roll)
  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      {rowHeader(roll.investigatorName ?? 'Unnamed Investigator', <span className="text-warning">Push asked</span>)}
      {targetLine(roll)}
      {recordLines(result, hidden)}
      {justificationLine(roll)}
    </li>
  )
}

function PushedRow({ roll, hidden }: { roll: RequestedRoll; hidden: boolean }) {
  const result = firstRecord(roll)
  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      {rowHeader(roll.investigatorName ?? 'Unnamed Investigator', <span className="text-warning">Pushed - waiting for the pushed roll</span>)}
      {targetLine(roll)}
      {recordLines(result, hidden)}
      {justificationLine(roll)}
      <p className="text-sm">{pushDiceLine(roll)}</p>
    </li>
  )
}

function outcomeText(record: CompletedRoll | undefined, roll: RequestedRoll): string {
  if (record?.percentile === null || record?.percentile === undefined) {
    return `${record?.result ?? 'unknown'}`
  }
  return `${record.result}: ${describeOutcome(record.percentile.successLevel, record.percentile.isSuccess, roll.difficulty)}`
}

function PushedRolledRow({ roll, hidden }: { roll: RequestedRoll; hidden: boolean }) {
  const first = firstRecord(roll)
  const pushed = pushedRecord(roll)
  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      {rowHeader(
        roll.investigatorName ?? 'Unnamed Investigator',
        <span className="inline-flex items-center gap-1">
          {pushed?.percentile?.isSuccess === true ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
          {outcomeText(pushed, roll)}
        </span>,
      )}
      <p className="text-sm">
        First roll: {outcomeText(first, roll)}
      </p>
      {recordLines(first, hidden)}
      {justificationLine(roll)}
      <p className="text-sm">{pushDiceLine(roll)}</p>
      {recordLines(pushed, hidden)}
    </li>
  )
}

function PushDeclinedRow({ roll, hidden }: { roll: RequestedRoll; hidden: boolean }) {
  const result = firstRecord(roll)
  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      {rowHeader(roll.investigatorName ?? 'Unnamed Investigator', <RollStatus roll={roll} result={result} />)}
      {targetLine(roll)}
      {recordLines(result, hidden)}
      {justificationLine(roll)}
      <p className="text-sm text-muted-foreground">Push declined</p>
    </li>
  )
}

function CancelledAfterPushRow({ roll, hidden }: { roll: RequestedRoll; hidden: boolean }) {
  const result = firstRecord(roll)
  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      {rowHeader(roll.investigatorName ?? 'Unnamed Investigator', <span className="text-muted-foreground">Cancelled</span>)}
      {targetLine(roll)}
      {recordLines(result, hidden)}
      {justificationLine(roll)}
      <p className="text-sm text-muted-foreground">The pushed roll was cancelled.</p>
    </li>
  )
}
