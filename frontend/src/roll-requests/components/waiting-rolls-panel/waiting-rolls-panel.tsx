import { useId, useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import { formatWallEntryTime } from '@/campaign-play/services/wallEntryTime'
import { RollsYouCanPush } from '@/roll-requests/components/rolls-you-can-push/rolls-you-can-push'
import { useMyPushableRolls, useMyRequestedRolls, useRollRequestedRoll } from '@/roll-requests/hooks/useRollRequests'
import { AlreadyRolledError, RequestedRollCancelledError, RequestedRollGoneError } from '@/roll-requests/services/rollRequestApi'
import { describeDice, describeOutcome, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import type { RequestedRoll, WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

interface WaitingRollsPanelProps {
  campaignId: string
}

/** "You rolled {result}: {outcome}." plus the check line when the Roll Record earns one, plus the push hint when the failed roll can be pushed. */
function successMessage(result: RequestedRoll): string {
  const completed = result.rolls[0]
  if (!completed?.percentile) {
    return `You rolled ${completed?.result ?? 'unknown'}.`
  }

  const outcome = describeOutcome(completed.percentile.successLevel, completed.percentile.isSuccess, result.difficulty)
  const check = completed.earnsExperienceCheck === true ? ' Experience check earned.' : ''
  const pushable = result.canBePushed ? ' You can ask to push it.' : ''
  return `You rolled ${completed.result}: ${outcome}.${check}${pushable}`
}

/** The panel stays for a waiting or pushable row, a decline note, or a status line from this tab. */
function hasPanelContent(rolls: WaitingRequestedRoll[], pushable: WaitingRequestedRoll[], status: string | null, declined: Array<{ key: string }>): boolean {
  return rolls.length > 0 || pushable.length > 0 || status !== null || declined.length > 0
}

/** The keys of Pushed rows in the waiting list, by roll request. */
function pushedRowKeys(rolls: WaitingRequestedRoll[]): Set<string> {
  return new Set(rolls.filter((row) => row.roll.status === 'Pushed').map((row) => row.rollRequestId))
}

/** PushAsked rows that left without their Pushed roll: declined, to be noted politely. */
function findDeclinedPushes(
  previous: Map<string, WaitingRequestedRoll>,
  next: Map<string, WaitingRequestedRoll>,
  pushedKeys: Set<string>,
): Array<{ key: string; message: string }> {
  const declined: Array<{ key: string; message: string }> = []
  for (const [key, row] of previous) {
    if (row.roll.status === 'PushAsked' && !next.has(key) && !pushedKeys.has(key)) {
      declined.push({ key, message: `The Keeper declined your ${rollTargetName(row.target)} push.` })
    }
  }
  return declined
}

/** Whether the panel stays for waiting rows, pushable rows, a decline note, or a status line. */
function panelHolding(waitingCount: number, pushableCount: number, status: string | null, declinedCount: number): boolean {
  return waitingCount > 0 || pushableCount > 0 || status !== null || declinedCount > 0
}

/** Focus for a live Waiting removal that took the focused row: the panel h2 while it stays, else the page h1. */
function focusHoldingHeading(holding: boolean, headingRef: RefObject<HTMLHeadingElement | null>) {
  if (holding) {
    headingRef.current?.focus()
  } else {
    document.querySelector<HTMLElement>('main h1')?.focus()
  }
}

/** Focus for a live pushable removal that took the focused row: the group h3 while it stays, else as for Waiting. */
function focusPushableHeading(
  groupHolding: boolean,
  holding: boolean,
  pushableHeadingRef: RefObject<HTMLHeadingElement | null>,
  headingRef: RefObject<HTMLHeadingElement | null>,
) {
  if (groupHolding) {
    pushableHeadingRef.current?.focus()
  } else {
    focusHoldingHeading(holding, headingRef)
  }
}

/**
 * The Player's waiting rolls (specs/roll-requests/ux.md sections 6, 17.3, and 19.1): the caller's Waiting and Pushed
 * Requested Rolls, oldest first, each with a "Roll {target}" button, and the "Rolls you can push" group. Shown with
 * at least one roll, a decline note, or a status line from this tab. A cancelled roll just leaves, silently (RR-UX-22);
 * a declined push leaves a polite note (RR-UX-28).
 */
export function WaitingRollsPanel({ campaignId }: WaitingRollsPanelProps) {
  const mine = useMyRequestedRolls(campaignId)
  const pushableQuery = useMyPushableRolls(campaignId)
  const rollMutation = useRollRequestedRoll(campaignId)
  const statusRef = useRef<HTMLParagraphElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const pushableHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultHeadingId = useId()
  const [rollingKey, setRollingKey] = useState<string | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [declined, setDeclined] = useState<Array<{ key: string; message: string }>>([])

  const rolls = useMemo(() => mine.data?.rolls ?? [], [mine.data])
  const pushable = useMemo(() => pushableQuery.data?.rolls ?? [], [pushableQuery.data])
  const investigatorName = mine.data?.investigatorName ?? pushableQuery.data?.investigatorName ?? null
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

  // A PushAsked row that leaves without its Pushed roll was declined: by the Keeper, or by removing the Investigator
  // from the Investigators present (UX 19.1). An approval arrives as a Pushed row instead and is announced
  // assertively; a late Pushed arrival clears a note it raced. Polite only, focus never moves (RR-A11Y-21).
  const previousPushable = useRef<Map<string, WaitingRequestedRoll> | null>(null)
  useEffect(() => {
    const previous = previousPushable.current
    const next = new Map(pushable.map((row) => [row.rollRequestId, row]))
    previousPushable.current = next
    if (previous === null) {
      return
    }
    const pushedKeys = pushedRowKeys(rolls)
    for (const declinedPush of findDeclinedPushes(previous, next, pushedKeys)) {
      setDeclined((current) =>
        current.some((note) => note.key === declinedPush.key) ? current : [...current, declinedPush],
      )
    }
    setDeclined((current) => {
      const kept = current.filter((note) => !pushedKeys.has(note.key))
      return kept.length === current.length ? current : kept
    })
  }, [pushable, rolls])

  // A live removal that takes away the focused row never leaves focus on the body (RR-A11Y-16, RR-A11Y-19): a Waiting
  // row moves focus to the panel's h2, a pushable row moves to the "Rolls you can push" h3, else the panel's h2, or
  // to the page h1 when the panel unmounts because it is empty. A decline leaves focus alone: its note is polite
  // (RR-A11Y-21).
  const previousKeys = useRef<{ waiting: string[]; pushable: Map<string, WaitingRequestedRoll> } | null>(null)
  useEffect(() => {
    const previous = previousKeys.current
    const waitingKeys = rolls.map((waiting) => waiting.rollRequestId)
    const pushableRows = new Map(pushable.map((row) => [row.rollRequestId, row]))
    previousKeys.current = { waiting: waitingKeys, pushable: pushableRows }
    if (previous === null || document.activeElement !== document.body) {
      return
    }
    const holding = panelHolding(waitingKeys.length, pushable.length, status, declined.length)
    if (waitingKeys.length < previous.waiting.length) {
      focusHoldingHeading(holding, headingRef)
    } else if (pushable.length < previous.pushable.size && findDeclinedPushes(previous.pushable, pushableRows, pushedRowKeys(rolls)).length === 0) {
      focusPushableHeading(pushable.length > 0, holding, pushableHeadingRef, headingRef)
    }
  }, [rolls, pushable, status, declined])

  if (!hasPanelContent(rolls, pushable, status, declined)) {
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
        <WaitingList rolls={rolls} targetCounts={targetCounts} rollingKey={rollingKey} failedKey={failedKey} onRoll={roll} />
      )}
      <RollsYouCanPush
        campaignId={campaignId}
        investigatorName={investigatorName}
        pushable={pushable}
        headingRef={pushableHeadingRef}
        onAsked={(targetName) => setStatus(`You asked the Keeper to push your ${targetName} roll.`)}
        onUnpushable={(targetName) => setStatus(`Your ${targetName} roll can't be pushed any more.`)}
      />
      {declined.map((note) => (
        <p key={note.key} role="status" className="mt-1 break-words">
          {note.message}
        </p>
      ))}
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

interface WaitingListProps {
  rolls: WaitingRequestedRoll[]
  targetCounts: Map<string, number>
  rollingKey: string | null
  failedKey: string | null
  onRoll: (waiting: WaitingRequestedRoll) => void
}

function WaitingList({ rolls, targetCounts, rollingKey, failedKey, onRoll }: WaitingListProps) {
  return (
    <ul className="mt-2 flex flex-col gap-3">
      {rolls.map((waiting) => (
        <WaitingListItem
          key={waiting.rollRequestId}
          waiting={waiting}
          ambiguous={(targetCounts.get(rollTargetName(waiting.target)) ?? 0) > 1}
          rolling={rollingKey === waiting.rollRequestId}
          failed={failedKey === waiting.rollRequestId}
          onRoll={() => onRoll(waiting)}
        />
      ))}
    </ul>
  )
}

/** One Waiting or Pushed row of the Player's list; a Pushed row names the approved dice and the pushed Roll. */
function WaitingListItem({ waiting, ambiguous, rolling, failed, onRoll }: {
  waiting: WaitingRequestedRoll
  ambiguous: boolean
  rolling: boolean
  failed: boolean
  onRoll: () => void
}) {
  const targetName = rollTargetName(waiting.target)
  const pushed = waiting.roll.status === 'Pushed'
  const rollName = pushed ? `Roll pushed ${targetName}` : `Roll ${targetName}`
  return (
    <li className="flex flex-col gap-1 border-t border-warning/40 pt-2">
      <p className="break-words">
        {targetName} . {waiting.roll.difficulty} . {pushedDice(waiting)}{pushed ? ' . pushed' : ''}
      </p>
      {waiting.message !== null && waiting.message !== '' && <p className="break-words">&quot;{waiting.message}&quot;</p>}
      <div>
        <Button
          type="button"
          className="min-h-11"
          disabled={rolling}
          onClick={onRoll}
          aria-label={ambiguous ? `${rollName}, requested ${formatWallEntryTime(waiting.createdAt, new Date()).text}` : pushed ? rollName : undefined}
        >
          {rolling ? 'Rolling...' : `Roll ${targetName}`}
        </Button>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t roll that. Try again.
        </p>
      )}
    </li>
  )
}

/** The approved dice for a Pushed row, falling back to the request's dice. */
function pushedDice(waiting: WaitingRequestedRoll): string {
  if (waiting.roll.status !== 'Pushed') {
    return describeDice(waiting.roll.bonusDice, waiting.roll.penaltyDice)
  }
  return describeDice(waiting.roll.pushBonusDice ?? waiting.roll.bonusDice, waiting.roll.pushPenaltyDice ?? waiting.roll.penaltyDice)
}
