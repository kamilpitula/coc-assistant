import { useId, useEffect, useMemo, useRef, useState } from 'react'

import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import { formatWallEntryTime } from '@/campaign-play/services/wallEntryTime'
import { useMyRequestedRolls, useRollRequestedRoll } from '@/roll-requests/hooks/useRollRequests'
import { AlreadyRolledError, RequestedRollCancelledError, RequestedRollGoneError } from '@/roll-requests/services/rollRequestApi'
import { describeDice, describeOutcome, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import type { RequestedRoll, WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

interface WaitingRollsPanelProps {
  campaignId: string
}

/** "You rolled {result}: {outcome}." plus the check line when the Roll Record earns one. */
function successMessage(result: RequestedRoll): string {
  const completed = result.rolls[0]
  if (!completed?.percentile) {
    return `You rolled ${completed?.result ?? 'unknown'}.`
  }

  const outcome = describeOutcome(completed.percentile.successLevel, completed.percentile.isSuccess, result.difficulty)
  const check = completed.earnsExperienceCheck === true ? ' Experience check earned.' : ''
  return `You rolled ${completed.result}: ${outcome}.${check}`
}

/**
 * The Player's waiting rolls (specs/roll-requests/ux.md sections 6 and 17.3): the caller's Waiting Requested Rolls,
 * oldest first, each with a "Roll {target}" button. Shown only with at least one roll or a status line from this tab.
 * A cancelled roll just leaves, silently (RR-UX-22).
 */
export function WaitingRollsPanel({ campaignId }: WaitingRollsPanelProps) {
  const mine = useMyRequestedRolls(campaignId)
  const rollMutation = useRollRequestedRoll(campaignId)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const resultHeadingId = useId()
  const [rollingKey, setRollingKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const rolls = useMemo(() => mine.data?.rolls ?? [], [mine.data])
  const targetCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const waiting of rolls) {
      const name = rollTargetName(waiting.target)
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return counts
  }, [rolls])

  useEffect(() => {
    if (status) {
      statusRef.current?.focus()
    }
  }, [status])

  // A live removal that takes away the focused row never leaves focus on the body (RR-A11Y-16): focus moves to the
  // panel's h2, or to the page h1 when the panel unmounts because it is empty.
  const previousKeys = useRef<string[] | null>(null)
  useEffect(() => {
    const previous = previousKeys.current
    const keys = rolls.map((waiting) => waiting.rollRequestId)
    previousKeys.current = keys
    if (previous === null || keys.length >= previous.length) {
      return
    }
    if (document.activeElement !== null && document.activeElement !== document.body) {
      return
    }
    if (keys.length > 0) {
      headingRef.current?.focus()
    } else {
      document.querySelector<HTMLElement>('main h1')?.focus()
    }
  }, [rolls])

  if (rolls.length === 0 && !status) {
    return null
  }

  function roll(waiting: WaitingRequestedRoll) {
    setFailedKey(null)
    setRollingKey(waiting.rollRequestId)
    rollMutation.mutate(
      { rollRequestId: waiting.rollRequestId, investigatorId: waiting.roll.investigatorId },
      {
        onSuccess: (result) => {
          setStatus(successMessage(result))
          setRollingKey(null)
        },
        onError: (error) => {
          if (error instanceof AlreadyRolledError) {
            setStatus(`Your ${rollTargetName(waiting.target)} roll was already made by the Keeper.`)
          } else if (!(error instanceof RequestedRollGoneError) && !(error instanceof NoActiveSceneError) && !(error instanceof RequestedRollCancelledError)) {
            setFailedKey(waiting.rollRequestId)
          }
          setRollingKey(null)
        },
      },
    )
  }

  return (
    <section aria-labelledby="rolls-waiting-for-you-heading" className="rounded-lg border border-warning bg-warning/10 p-4">
      <h2 id="rolls-waiting-for-you-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        Rolls waiting for you<span className="sr-only">, {rolls.length}</span>{' '}
        <Badge variant="secondary" aria-hidden="true" className="px-1.5 tabular-nums">{rolls.length}</Badge>
      </h2>
      {rolls.length > 0 && (
        <ul className="mt-2 flex flex-col gap-3">
          {rolls.map((waiting) => {
            const targetName = rollTargetName(waiting.target)
            const ambiguous = (targetCounts.get(targetName) ?? 0) > 1
            return (
              <li key={waiting.rollRequestId} className="flex flex-col gap-1 border-t border-warning/40 pt-2">
                <p className="break-words">
                  {targetName} . {waiting.roll.difficulty} . {describeDice(waiting.roll.bonusDice, waiting.roll.penaltyDice)}
                </p>
                {waiting.message !== null && waiting.message !== '' && <p className="break-words">&quot;{waiting.message}&quot;</p>}
                <div>
                  <Button
                    type="button"
                    className="min-h-11"
                    disabled={rollingKey === waiting.rollRequestId}
                    onClick={() => roll(waiting)}
                    aria-label={ambiguous ? `Roll ${targetName}, requested ${formatWallEntryTime(waiting.createdAt, new Date()).text}` : undefined}
                  >
                    {rollingKey === waiting.rollRequestId ? 'Rolling...' : `Roll ${targetName}`}
                  </Button>
                </div>
                {failedKey === waiting.rollRequestId && (
                  <p role="alert" className="text-sm text-destructive">
                    We couldn&apos;t roll that. Try again.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {status && (
        <section aria-labelledby={resultHeadingId} className="mt-4 border-t border-warning/40 pt-3">
          <h3 id={resultHeadingId} className="text-sm font-semibold">
            Your last roll
          </h3>
          <p ref={statusRef} role="status" tabIndex={-1} className="mt-1 break-words">
            {status}
          </p>
        </section>
      )}
    </section>
  )
}
