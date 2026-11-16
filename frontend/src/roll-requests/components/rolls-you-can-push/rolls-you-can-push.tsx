import { useEffect, useId, useRef, useState, type RefObject } from 'react'

import { formatWallEntryTime } from '@/campaign-play/services/wallEntryTime'
import { useAskToPush } from '@/roll-requests/hooks/useRollRequests'
import { AskPushRefusedError, PushNotAllowedError, RequestedRollCancelledError, RequestedRollGoneError } from '@/roll-requests/services/rollRequestApi'
import { describeOutcome, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import { PUSH_JUSTIFICATION_MAX_LENGTH } from '@/roll-requests/types/RollRequest'
import type { WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'
import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'

interface RollsYouCanPushProps {
  campaignId: string
  investigatorName: string | null
  pushable: WaitingRequestedRoll[]
  /** The panel's h3 for live-removal focus; the panel focuses it when a removed row held focus. */
  headingRef: RefObject<HTMLHeadingElement | null>
  /** The panel reports "You asked ..." and moves focus to its status. */
  onAsked: (targetName: string) => void
  /** The panel reports the row can no longer be pushed and moves focus to its status. */
  onUnpushable: (targetName: string) => void
}

function firstResultLine(waiting: WaitingRequestedRoll): string {
  const record = waiting.roll.rolls[0]
  const outcome = record?.percentile ? describeOutcome(record.percentile.successLevel, record.percentile.isSuccess, waiting.roll.difficulty) : `${record?.result ?? 'unknown'}`
  return `${record?.result ?? 'unknown'}: ${outcome}`
}

/**
 * The Player's failed, pushable rolls with "Push this roll" (specs/roll-requests/ux.md section 19.1): an h3 group
 * inside the waiting-rolls panel, after the waiting list. Asking turns the row into "Push asked - waiting for the
 * Keeper"; a declined row leaves through the live signal and the panel notes it.
 */
export function RollsYouCanPush({ campaignId, investigatorName, pushable, headingRef, onAsked, onUnpushable }: RollsYouCanPushProps) {
  const askMutation = useAskToPush(campaignId)
  const toggleRefs = useRef(new Map<string, HTMLButtonElement>())
  const justifyRefs = useRef(new Map<string, HTMLTextAreaElement>())
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [refusal, setRefusal] = useState<{ key: string; message: string } | null>(null)
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const hintId = useId()
  const errorId = useId()

  // Opening a group moves focus into its Textarea (RR-A11Y-19).
  useEffect(() => {
    if (openKey !== null) {
      justifyRefs.current.get(openKey)?.focus()
    }
  }, [openKey])

  const targetCounts = new Map<string, number>()
  for (const waiting of pushable) {
    const name = rollTargetName(waiting.target)
    targetCounts.set(name, (targetCounts.get(name) ?? 0) + 1)
  }

  if (pushable.length === 0) {
    return null
  }

  function toggleLabel(waiting: WaitingRequestedRoll): string | undefined {
    const targetName = rollTargetName(waiting.target)
    if ((targetCounts.get(targetName) ?? 0) <= 1) {
      return undefined
    }
    return `Push ${targetName} roll, requested ${formatWallEntryTime(waiting.createdAt, new Date()).text}`
  }

  function open(waiting: WaitingRequestedRoll) {
    setRefusal(null)
    setFailedKey(null)
    setDraft('')
    setOpenKey(waiting.rollRequestId)
  }

  function close(waiting: WaitingRequestedRoll) {
    setOpenKey(null)
    setDraft('')
    setRefusal(null)
    setFailedKey(null)
    toggleRefs.current.get(waiting.rollRequestId)?.focus()
  }

  function ask(waiting: WaitingRequestedRoll) {
    const targetName = rollTargetName(waiting.target)
    setRefusal(null)
    setFailedKey(null)
    askMutation.mutate(
      { rollRequestId: waiting.rollRequestId, investigatorId: waiting.roll.investigatorId, justification: draft },
      {
        onSuccess: () => {
          setOpenKey(null)
          setDraft('')
          onAsked(targetName)
        },
        onError: (error) => {
          if (error instanceof AskPushRefusedError) {
            setRefusal({ key: waiting.rollRequestId, message: error.message })
          } else if (error instanceof PushNotAllowedError || error instanceof RequestedRollCancelledError) {
            onUnpushable(targetName)
          } else if (!(error instanceof RequestedRollGoneError) && !(error instanceof NoActiveSceneError)) {
            setFailedKey(waiting.rollRequestId)
          }
        },
      },
    )
  }

  return (
    <section aria-labelledby="rolls-you-can-push-heading" className="mt-4 border-t border-warning/40 pt-3">
      <h3 id="rolls-you-can-push-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold">
        Rolls you can push
      </h3>
      <ul className="mt-2 flex flex-col gap-3">
        {pushable.map((waiting) => {
          if (waiting.roll.status === 'PushAsked') {
            return <PushAskedRow key={waiting.rollRequestId} waiting={waiting} />
          }
          return (
            <AskablePushRow
              key={waiting.rollRequestId}
              waiting={waiting}
              investigatorName={investigatorName}
              toggleLabel={toggleLabel(waiting)}
              isOpen={openKey === waiting.rollRequestId}
              draft={draft}
              asking={askMutation.isPending && openKey === waiting.rollRequestId}
              refusal={refusal !== null && refusal.key === waiting.rollRequestId ? refusal.message : null}
              failed={failedKey === waiting.rollRequestId}
              hintId={hintId}
              errorId={errorId}
              registerToggle={(element) => {
                if (element) {
                  toggleRefs.current.set(waiting.rollRequestId, element)
                } else {
                  toggleRefs.current.delete(waiting.rollRequestId)
                }
              }}
              registerJustification={(element) => {
                if (element) {
                  justifyRefs.current.set(waiting.rollRequestId, element)
                } else {
                  justifyRefs.current.delete(waiting.rollRequestId)
                }
              }}
              onToggle={() => (openKey === waiting.rollRequestId ? close(waiting) : open(waiting))}
              onDraft={setDraft}
              onAsk={() => ask(waiting)}
              onClose={() => close(waiting)}
            />
          )
        })}
      </ul>
    </section>
  )
}

/** The trimmed length against the limit, with the empty hint (specs/roll-requests/ux.md section 19.1). */
function JustificationCounter({ trimmedLength, hintId }: { trimmedLength: number; hintId: string }) {
  return (
    <p id={hintId} className="text-sm text-muted-foreground">
      {trimmedLength} / {PUSH_JUSTIFICATION_MAX_LENGTH}
      {trimmedLength === 0 && ' - Write a justification first.'}
    </p>
  )
}

function PushAskedRow({ waiting }: { waiting: WaitingRequestedRoll }) {
  const targetName = rollTargetName(waiting.target)
  return (
    <li className="flex flex-col gap-1 border-t border-warning/40 pt-2">
      <p className="break-words">
        {targetName} . {firstResultLine(waiting)}
      </p>
      <p className="text-sm text-warning">Push asked - waiting for the Keeper</p>
      <p className="text-sm break-words">Push justification: &quot;{waiting.roll.pushJustification}&quot;</p>
    </li>
  )
}

interface AskablePushRowProps {
  waiting: WaitingRequestedRoll
  investigatorName: string | null
  toggleLabel: string | undefined
  isOpen: boolean
  draft: string
  asking: boolean
  refusal: string | null
  failed: boolean
  hintId: string
  errorId: string
  registerToggle: (element: HTMLButtonElement | null) => void
  registerJustification: (element: HTMLTextAreaElement | null) => void
  onToggle: () => void
  onDraft: (draft: string) => void
  onAsk: () => void
  onClose: () => void
}

function AskablePushRow({
  waiting,
  investigatorName,
  toggleLabel,
  isOpen,
  draft,
  asking,
  refusal,
  failed,
  hintId,
  errorId,
  registerToggle,
  registerJustification,
  onToggle,
  onDraft,
  onAsk,
  onClose,
}: AskablePushRowProps) {
  const targetName = rollTargetName(waiting.target)
  return (
    <li className="flex flex-col gap-1 border-t border-warning/40 pt-2">
      <p className="break-words">
        {targetName} . {firstResultLine(waiting)}
      </p>
      {waiting.message !== null && waiting.message !== '' && <p className="break-words">&quot;{waiting.message}&quot;</p>}
      <div>
        <Button
          ref={registerToggle}
          type="button"
          variant="secondary"
          className="min-h-11"
          aria-expanded={isOpen}
          aria-label={toggleLabel ?? `Push ${targetName} roll`}
          onClick={onToggle}
        >
          Push this roll
        </Button>
      </div>
      {isOpen && (
        <JustificationForm
          waiting={waiting}
          investigatorName={investigatorName}
          draft={draft}
          asking={asking}
          refusal={refusal}
          failed={failed}
          hintId={hintId}
          errorId={errorId}
          registerJustification={registerJustification}
          onDraft={onDraft}
          onAsk={onAsk}
          onClose={onClose}
        />
      )}
    </li>
  )
}

interface JustificationFormProps {
  waiting: WaitingRequestedRoll
  investigatorName: string | null
  draft: string
  asking: boolean
  refusal: string | null
  failed: boolean
  hintId: string
  errorId: string
  registerJustification: (element: HTMLTextAreaElement | null) => void
  onDraft: (draft: string) => void
  onAsk: () => void
  onClose: () => void
}

function JustificationForm({
  waiting,
  investigatorName,
  draft,
  asking,
  refusal,
  failed,
  hintId,
  errorId,
  registerJustification,
  onDraft,
  onAsk,
  onClose,
}: JustificationFormProps) {
  const targetName = rollTargetName(waiting.target)
  const trimmed = draft.trim()
  const tooLong = trimmed.length > PUSH_JUSTIFICATION_MAX_LENGTH
  return (
    <div role="group" aria-label={`Push justification for ${targetName}`} className="flex flex-col gap-2">
      <label htmlFor={`push-justification-${waiting.rollRequestId}`} className="text-sm font-medium">
        Tell the Keeper how {investigatorName ?? waiting.roll.investigatorName ?? 'your Investigator'} tries again.
      </label>
      <Textarea
        ref={registerJustification}
        id={`push-justification-${waiting.rollRequestId}`}
        rows={3}
        value={draft}
        aria-invalid={tooLong}
        aria-describedby={tooLong ? errorId : hintId}
        onChange={(event) => onDraft(event.target.value)}
      />
      {tooLong ? (
        <p id={errorId} className="text-sm text-destructive">
          Justifications can be at most 2000 characters.
        </p>
      ) : (
        <JustificationCounter trimmedLength={trimmed.length} hintId={hintId} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" disabled={trimmed.length === 0 || tooLong || asking} onClick={onAsk}>
          {asking ? 'Asking...' : 'Ask the Keeper'}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" onClick={onClose}>
          Never mind
        </Button>
      </div>
      {refusal !== null && (
        <p role="alert" className="text-sm text-destructive">
          {refusal}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t send that. Try again.
        </p>
      )}
    </div>
  )
}
