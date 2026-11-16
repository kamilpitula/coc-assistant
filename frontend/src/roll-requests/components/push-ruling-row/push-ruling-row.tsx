import { useEffect, useRef, useState } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { describeOutcome, rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

export interface PushRulingRowProps {
  request: RollRequest
  roll: RequestedRoll
  /** Any of the row's actions is in flight: every button is disabled. */
  busy: boolean
  approving: boolean
  declining: boolean
  failed: 'approve' | 'decline' | null
  onApprove: (bonusDice: number, penaltyDice: number) => void
  onDecline: () => void
}

const DICE_OPTIONS = ['0', '1', '2']

function firstResult(roll: RequestedRoll): string {
  const record = roll.rolls[0]
  const outcome = record?.percentile ? describeOutcome(record.percentile.successLevel, record.percentile.isSuccess, roll.difficulty) : `${record?.result ?? 'unknown'}`
  return `${record?.result ?? 'unknown'}: ${outcome}`
}

/**
 * The Keeper's push ruling row (specs/roll-requests/ux.md section 19.2): a PushAsked Requested Roll with the
 * justification and the first result, "Approve push" opening the pushed-roll dice, and the immediate "Decline push".
 * The pushed roll keeps the request's Difficulty; only the dice are set here.
 */
export function PushRulingRow({ request, roll, busy, approving, declining, failed, onApprove, onDecline }: PushRulingRowProps) {
  const targetName = rollTargetName(request.target)
  const name = roll.investigatorName ?? 'Unnamed Investigator'
  const [diceOpen, setDiceOpen] = useState(false)
  const [bonusDice, setBonusDice] = useState(String(roll.bonusDice))
  const [penaltyDice, setPenaltyDice] = useState(String(roll.penaltyDice))
  const toggleRef = useRef<HTMLButtonElement>(null)
  const bonusRef = useRef<HTMLButtonElement>(null)

  // Opening the dice moves focus to "Bonus Dice" (RR-A11Y-19).
  useEffect(() => {
    if (diceOpen) {
      bonusRef.current?.focus()
    }
  }, [diceOpen])

  function toggleDice() {
    if (diceOpen) {
      setDiceOpen(false)
      toggleRef.current?.focus()
    } else {
      setDiceOpen(true)
    }
  }

  return (
    <li className="flex flex-col gap-1 border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-words">
          {name} . {targetName} . asks to push . first roll {firstResult(roll)}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <WallEntryTime createdAt={request.createdAt} />
          <Button
            ref={toggleRef}
            type="button"
            variant="secondary"
            className="min-h-11"
            disabled={busy}
            aria-expanded={diceOpen}
            aria-label={`Approve push of ${targetName} for ${name}`}
            onClick={toggleDice}
          >
            Approve push
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={busy}
            aria-label={`Decline push of ${targetName} for ${name}`}
            onClick={onDecline}
          >
            {declining ? 'Declining...' : 'Decline push'}
          </Button>
        </span>
      </div>
      <p className="break-words whitespace-pre-line">&quot;{roll.pushJustification}&quot;</p>
      {diceOpen && (
        <div role="group" aria-label={`Dice for ${name}'s pushed roll`} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`push-bonus-${request.id}-${roll.investigatorId}`} className="text-sm font-medium">
              Bonus Dice
            </label>
            <Select value={bonusDice} onValueChange={setBonusDice} disabled={busy}>
              <SelectTrigger ref={bonusRef} id={`push-bonus-${request.id}-${roll.investigatorId}`} className="min-h-11 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DICE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`push-penalty-${request.id}-${roll.investigatorId}`} className="text-sm font-medium">
              Penalty Dice
            </label>
            <Select value={penaltyDice} onValueChange={setPenaltyDice} disabled={busy}>
              <SelectTrigger id={`push-penalty-${request.id}-${roll.investigatorId}`} className="min-h-11 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DICE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="min-h-11"
            disabled={busy}
            aria-label={`Confirm approval of ${targetName} push for ${name}`}
            onClick={() => onApprove(Number(bonusDice), Number(penaltyDice))}
          >
            {approving ? 'Approving...' : 'Confirm approval'}
          </Button>
        </div>
      )}
      {failed !== null && (
        <p role="alert" className="text-sm text-destructive">
          {failed === 'approve' ? "We couldn't approve that push. Try again." : "We couldn't decline that push. Try again."}
        </p>
      )}
    </li>
  )
}
