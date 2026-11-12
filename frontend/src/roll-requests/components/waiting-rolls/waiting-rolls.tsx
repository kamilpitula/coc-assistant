import { useEffect, useMemo, useRef, useState } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { useActiveSceneRollRequests, useRollRequestedRoll } from '@/roll-requests/hooks/useRollRequests'
import { AlreadyRolledError } from '@/roll-requests/services/rollRequestApi'
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
      .filter((roll) => roll.status === 'Waiting')
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
 * The Keeper's Waiting rolls (specs/roll-requests/ux.md section 4): every Waiting Requested Roll of the Active
 * Scene's requests, oldest first, each with a "Roll for {name}" button that the Keeper uses to roll for the Player.
 */
export function WaitingRolls({ campaignId }: WaitingRollsProps) {
  const requests = useActiveSceneRollRequests(campaignId)
  const rollMutation = useRollRequestedRoll(campaignId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [rollingKey, setRollingKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const pendingFocus = useRef<{ keys: string[]; rolledKey: string } | null>(null)

  const rows = useMemo(() => waitingRowsOf(requests.data ?? []), [requests.data])

  useEffect(() => {
    const request = pendingFocus.current
    if (!request) {
      return
    }

    const remaining = new Set(rows.map((row) => row.key))
    const at = request.keys.indexOf(request.rolledKey)
    const next =
      request.keys.slice(at + 1).find((key) => key !== request.rolledKey && remaining.has(key)) ??
      [...request.keys.slice(0, at)].reverse().find((key) => key !== request.rolledKey && remaining.has(key))

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

  function roll(row: WaitingRow) {
    setFailedKey(null)
    setRollingKey(row.key)
    rollMutation.mutate(
      { rollRequestId: row.request.id, investigatorId: row.roll.investigatorId },
      {
        onSuccess: (result) => {
          setStatus(successMessage(row, result))
          pendingFocus.current = { keys: rows.map((candidate) => candidate.key), rolledKey: row.key }
          setRollingKey(null)
        },
        onError: (error) => {
          if (error instanceof AlreadyRolledError) {
            setStatus(`${displayName(row)}'s ${rollTargetName(row.request.target)} roll was already made.`)
            pendingFocus.current = { keys: rows.map((candidate) => candidate.key), rolledKey: row.key }
          } else {
            setFailedKey(row.key)
          }
          setRollingKey(null)
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
            <WaitingRowItem
              key={row.key}
              row={row}
              rolling={rollingKey === row.key}
              failed={failedKey === row.key}
              registerButton={(element) => {
                if (element) {
                  buttonRefs.current.set(row.key, element)
                } else {
                  buttonRefs.current.delete(row.key)
                }
              }}
              onRoll={() => roll(row)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function WaitingRowItem({
  row,
  rolling,
  failed,
  registerButton,
  onRoll,
}: {
  row: WaitingRow
  rolling: boolean
  failed: boolean
  registerButton: (element: HTMLButtonElement | null) => void
  onRoll: () => void
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
          <Button ref={registerButton} type="button" variant="secondary" className="min-h-11" disabled={rolling} onClick={onRoll} aria-label={`Roll ${targetName} for ${name}`}>
            {rolling ? 'Rolling...' : `Roll for ${name}`}
          </Button>
        </span>
      </div>
      {row.request.message !== null && row.request.message !== '' && (
        <p className="line-clamp-1 break-words text-sm text-muted-foreground">{row.request.message}</p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t roll that. Try again.
        </p>
      )}
    </li>
  )
}
