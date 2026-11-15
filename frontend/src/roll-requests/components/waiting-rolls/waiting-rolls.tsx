import { useEffect, useMemo, useRef, useState } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { PushRulingRow } from '@/roll-requests/components/push-ruling-row/push-ruling-row'
import { useActiveSceneRollRequests, useApprovePush, useCancelRequestedRoll, useDeclinePush, useRollRequestedRoll } from '@/roll-requests/hooks/useRollRequests'
import { AlreadyRolledError, PushAlreadyRuledError, RequestedRollCancelledError } from '@/roll-requests/services/rollRequestApi'
import { describeDice, describeOutcome, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface WaitingRollsProps {
  campaignId: string
}

/** One Waiting Requested Roll with the Roll Request it belongs to. */
interface WaitingRow {
  key: string
  request: RollRequest
  roll: RequestedRoll
}

/** Every Waiting Requested Roll of the Active Scene's requests, oldest request first. */
function waitingRowsOf(requests: RollRequest[]): WaitingRow[] {
  return requests.flatMap((request) =>
    request.requestedRolls
      .filter((roll) => roll.status === 'Waiting' || roll.status === 'PushAsked' || roll.status === 'Pushed')
      .map((roll) => ({ key: `${request.id}:${roll.investigatorId}`, request, roll })),
  )
}

function displayName(row: WaitingRow): string {
  return row.roll.investigatorName ?? 'Unnamed Investigator'
}

function successMessage(row: WaitingRow, result: RequestedRoll): string {
  const targetName = rollTargetName(row.request.target)
  const percentile = result.rolls[0]?.percentile
  if (!percentile) {
    return `${displayName(row)} rolled ${result.rolls[0]?.result} for ${targetName}.`
  }

  return `${displayName(row)} rolled ${percentile.result} for ${targetName}: ${describeOutcome(percentile.successLevel, percentile.isSuccess, row.roll.difficulty)}.`
}

/**
 * The refused refetch for every action (specs/roll-requests/ux.md sections 4, 17.1, and 19.2): a 409 names the
 * refusal and the row leaves, unless the Scene is gone; anything else returns null and the row keeps an inline error.
 * A cancel that finds an already-cancelled roll says so; a roll that loses its race to a cancel says the roll was
 * cancelled. A ruled push says it was already ruled on.
 */
function refusalStatusFor(error: unknown, row: WaitingRow, action: 'roll' | 'cancel' | 'approve' | 'decline'): string | null {
  const label = `${displayName(row)}'s ${rollTargetName(row.request.target)} roll`
  if (error instanceof AlreadyRolledError) {
    return `${label} was already made.`
  }
  if (error instanceof PushAlreadyRuledError) {
    return `${displayName(row)}'s push was already ruled on.`
  }
  if (error instanceof RequestedRollCancelledError) {
    return action === 'roll' || action === 'approve' || action === 'decline' ? `${label} was cancelled.` : `${label} was already cancelled.`
  }
  return null
}

/**
 * The Keeper's Waiting rolls (specs/roll-requests/ux.md sections 4, 17.1, and 19.2): every Waiting, PushAsked, and
 * Pushed Requested Roll of the Active Scene's requests, oldest first, each with its action: "Roll for {name}" and
 * "Cancel", the push ruling row, or "Roll pushed" without a cancel.
 */
export function WaitingRolls({ campaignId }: WaitingRollsProps) {
  const requests = useActiveSceneRollRequests(campaignId)
  const rollMutation = useRollRequestedRoll(campaignId)
  const cancelMutation = useCancelRequestedRoll(campaignId)
  const approveMutation = useApprovePush(campaignId)
  const declineMutation = useDeclinePush(campaignId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [busy, setBusy] = useState<{ key: string; action: 'roll' | 'cancel' | 'approve' | 'decline' } | null>(null)
  const [failed, setFailed] = useState<{ key: string; action: 'roll' | 'cancel' | 'approve' | 'decline' } | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const pendingFocus = useRef<{ keys: string[]; key: string; same: boolean } | null>(null)

  const rows = useMemo(() => waitingRowsOf(requests.data ?? []), [requests.data])

  useEffect(() => {
    const request = pendingFocus.current
    if (!request) {
      return
    }

    const remaining = new Set(rows.map((row) => row.key))
    if (request.same && remaining.has(request.key)) {
      buttonRefs.current.get(request.key)?.focus()
      pendingFocus.current = null
      return
    }
    const at = request.keys.indexOf(request.key)
    const next =
      request.keys.slice(at + 1).find((key) => key !== request.key && remaining.has(key)) ??
      [...request.keys.slice(0, at)].reverse().find((key) => key !== request.key && remaining.has(key))

    if (next) {
      buttonRefs.current.get(next)?.focus()
    } else {
      headingRef.current?.focus()
    }
    pendingFocus.current = null
  }, [rows])

  if (requests.data === null) {
    return null
  }

  if (requests.isError) {
    return (
      <section aria-labelledby="waiting-rolls-heading" className="flex flex-col items-start gap-2">
        <h2 id="waiting-rolls-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          Waiting rolls
        </h2>
        <p className="text-sm">We couldn&apos;t load the waiting rolls.</p>
        <Button type="button" variant="outline" onClick={() => void requests.refetch()}>
          Try again
        </Button>
      </section>
    )
  }

  if (requests.isPending || !requests.data) {
    return (
      <section aria-labelledby="waiting-rolls-heading" aria-busy="true" className="flex flex-col gap-2">
        <h2 id="waiting-rolls-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          Waiting rolls
        </h2>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </section>
    )
  }

  function leaveRow(row: WaitingRow, message: string) {
    setStatus(message)
    pendingFocus.current = { keys: rows.map((candidate) => candidate.key), key: row.key, same: false }
    setBusy(null)
  }

  function failRow(row: WaitingRow, action: 'roll' | 'cancel' | 'approve' | 'decline') {
    setFailed({ key: row.key, action })
    setBusy(null)
  }

  function roll(row: WaitingRow) {
    setFailed(null)
    setBusy({ key: row.key, action: 'roll' })
    rollMutation.mutate(
      { rollRequestId: row.request.id, investigatorId: row.roll.investigatorId },
      {
        onSuccess: (result) => leaveRow(row, successMessage(row, result)),
        onError: (error) => {
          const refusal = refusalStatusFor(error, row, 'roll')
          if (refusal) {
            leaveRow(row, refusal)
          } else {
            failRow(row, 'roll')
          }
        },
      },
    )
  }

  function cancel(row: WaitingRow) {
    setFailed(null)
    setBusy({ key: row.key, action: 'cancel' })
    cancelMutation.mutate(
      { rollRequestId: row.request.id, investigatorId: row.roll.investigatorId },
      {
        onSuccess: () => leaveRow(row, `${displayName(row)}'s ${rollTargetName(row.request.target)} roll was cancelled.`),
        onError: (error) => {
          const refusal = refusalStatusFor(error, row, 'cancel')
          if (refusal) {
            leaveRow(row, refusal)
          } else {
            failRow(row, 'cancel')
          }
        },
      },
    )
  }

  function approve(row: WaitingRow, bonusDice: number, penaltyDice: number) {
    setFailed(null)
    setBusy({ key: row.key, action: 'approve' })
    approveMutation.mutate(
      { rollRequestId: row.request.id, investigatorId: row.roll.investigatorId, bonusDice, penaltyDice },
      {
        onSuccess: () => {
          setStatus(`${displayName(row)}'s push was approved.`)
          pendingFocus.current = { keys: rows.map((candidate) => candidate.key), key: row.key, same: true }
          setBusy(null)
        },
        onError: (error) => {
          const refusal = refusalStatusFor(error, row, 'approve')
          if (refusal) {
            leaveRow(row, refusal)
          } else {
            failRow(row, 'approve')
          }
        },
      },
    )
  }

  function decline(row: WaitingRow) {
    setFailed(null)
    setBusy({ key: row.key, action: 'decline' })
    declineMutation.mutate(
      { rollRequestId: row.request.id, investigatorId: row.roll.investigatorId },
      {
        onSuccess: () => leaveRow(row, `${displayName(row)}'s push was declined.`),
        onError: (error) => {
          const refusal = refusalStatusFor(error, row, 'decline')
          if (refusal) {
            leaveRow(row, refusal)
          } else {
            failRow(row, 'decline')
          }
        },
      },
    )
  }

  return (
    <section aria-labelledby="waiting-rolls-heading" className="flex flex-col gap-2">
      <h2 id="waiting-rolls-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        Waiting rolls<span className="sr-only">, {rows.length}</span>{' '}
        <Badge variant="secondary" aria-hidden="true" className="px-1.5 tabular-nums">{rows.length}</Badge>
      </h2>
      {status && <p role="status">{status}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rolls waiting.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <WaitingRowView
              key={row.key}
              row={row}
              busyAction={busy?.key === row.key ? busy.action : null}
              failedAction={failed?.key === row.key ? failed.action : null}
              registerButton={(element) => {
                if (element) {
                  buttonRefs.current.set(row.key, element)
                } else {
                  buttonRefs.current.delete(row.key)
                }
              }}
              onRoll={() => roll(row)}
              onCancel={() => cancel(row)}
              onApprove={(bonusDice, penaltyDice) => approve(row, bonusDice, penaltyDice)}
              onDecline={() => decline(row)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

interface WaitingRowViewProps {
  row: WaitingRow
  busyAction: 'roll' | 'cancel' | 'approve' | 'decline' | null
  failedAction: 'roll' | 'cancel' | 'approve' | 'decline' | null
  registerButton: (element: HTMLButtonElement | null) => void
  onRoll: () => void
  onCancel: () => void
  onApprove: (bonusDice: number, penaltyDice: number) => void
  onDecline: () => void
}

// Strategy from the row state: the Waiting row rolls and cancels, the ruling row approves and declines, the Pushed
// row only rolls (specs/roll-requests/ux.md section 19.2).
function WaitingRowView({ row, busyAction, failedAction, registerButton, onRoll, onCancel, onApprove, onDecline }: WaitingRowViewProps) {
  const status = row.roll.status
  if (status !== 'Waiting' && status !== 'PushAsked' && status !== 'Pushed') {
    return null
  }
  return {
    Waiting: (
      <WaitingRowItem
        row={row}
        busy={busyAction !== null}
        cancelling={busyAction === 'cancel'}
        failed={failedAction === 'approve' || failedAction === 'decline' ? null : failedAction}
        registerButton={registerButton}
        onRoll={onRoll}
        onCancel={onCancel}
      />
    ),
    PushAsked: (
      <PushRulingRow
        request={row.request}
        roll={row.roll}
        busy={busyAction !== null}
        approving={busyAction === 'approve'}
        declining={busyAction === 'decline'}
        failed={failedAction === 'approve' || failedAction === 'decline' ? failedAction : null}
        onApprove={onApprove}
        onDecline={onDecline}
      />
    ),
    Pushed: (
      <PushedRowItem
        row={row}
        busy={busyAction !== null}
        failed={failedAction === 'roll' ? failedAction : null}
        registerButton={registerButton}
        onRoll={onRoll}
      />
    ),
  }[status]
}

function WaitingRowItem({  row,
  busy,
  cancelling,
  failed,
  registerButton,
  onRoll,
  onCancel,
}: {
  row: WaitingRow
  busy: boolean
  cancelling: boolean
  failed: 'roll' | 'cancel' | null
  registerButton: (element: HTMLButtonElement | null) => void
  onRoll: () => void
  onCancel: () => void
}) {
  const targetName = rollTargetName(row.request.target)
  const name = displayName(row)

  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-words">
          {name} . {targetName} . {row.roll.difficulty} . {describeDice(row.roll.bonusDice, row.roll.penaltyDice)}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <WallEntryTime createdAt={row.request.createdAt} />
          <Button ref={registerButton} type="button" variant="secondary" className="min-h-11" disabled={busy} onClick={onRoll} aria-label={`Roll ${targetName} for ${name}`}>
            {busy && !cancelling ? 'Rolling...' : `Roll for ${name}`}
          </Button>
          <Button type="button" variant="ghost" className="min-h-11" disabled={busy} onClick={onCancel} aria-label={`Cancel ${targetName} roll for ${name}`}>
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </Button>
        </span>
      </div>
      {row.request.message !== null && row.request.message !== '' && (
        <p className="line-clamp-1 break-words text-sm text-muted-foreground">{row.request.message}</p>
      )}
      {failed !== null && (
        <p role="alert" className="text-sm text-destructive">
          {failed === 'roll' ? "We couldn't roll that. Try again." : "We couldn't cancel that. Try again."}
        </p>
      )}
    </li>
  )
}

function PushedRowItem({
  row,
  busy,
  failed,
  registerButton,
  onRoll,
}: {
  row: WaitingRow
  busy: boolean
  failed: 'roll' | null
  registerButton: (element: HTMLButtonElement | null) => void
  onRoll: () => void
}) {
  const targetName = rollTargetName(row.request.target)
  const name = displayName(row)

  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-words">
          {name} . {targetName} . {row.roll.difficulty} . {describeDice(row.roll.pushBonusDice ?? row.roll.bonusDice, row.roll.pushPenaltyDice ?? row.roll.penaltyDice)} . pushed
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <WallEntryTime createdAt={row.request.createdAt} />
          <Button ref={registerButton} type="button" variant="secondary" className="min-h-11" disabled={busy} onClick={onRoll} aria-label={`Roll pushed ${targetName} for ${name}`}>
            {busy ? 'Rolling...' : `Roll for ${name}`}
          </Button>
        </span>
      </div>
      {row.request.message !== null && row.request.message !== '' && (
        <p className="line-clamp-1 break-words text-sm text-muted-foreground">{row.request.message}</p>
      )}
      {failed !== null && (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t roll that. Try again.
        </p>
      )}
    </li>
  )
}
