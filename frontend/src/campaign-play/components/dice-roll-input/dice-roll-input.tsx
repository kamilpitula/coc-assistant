import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { diceRange } from '@/campaign-play/services/characterSheetValidation'

interface DiceRollInputProps {
  field: string
  /** What the roll is for, for example "Luck" or "Luck, second roll". */
  rollLabel: string
  /** The dice expression from the rules data, for example "3D6". */
  dice: string
  /** The rules data's multiplier for the raw total, for example 5 for Luck. */
  multiplier: number
  value: number | null
  error?: string
  onChange: (value: number | null) => void
  onBlur?: (field: string, nextFocus: EventTarget | null) => void
}

/**
 * One dice row: the Player enters the raw dice total and sees the computed value
 * (specs/character-sheet/ux.md section 6.2; UX-9; A11Y-3 names the roll and the dice).
 */
export function DiceRollInput({ field, rollLabel, dice, multiplier, value, error, onChange, onBlur }: DiceRollInputProps) {
  const range = diceRange(dice)
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-24 flex-col">
        <span className="text-sm font-medium">{rollLabel}</span>
        <span className="text-sm text-muted-foreground">
          {dice} x {multiplier}
        </span>
      </div>
      <WizardField
        field={field}
        label={`${rollLabel}, ${dice} total`}
        type="number"
        value={value}
        help={`${range.minimum} to ${range.maximum}`}
        error={error}
        onChange={onChange}
        onBlur={onBlur}
        className="w-48"
      />
      {value !== null && <p className="pb-2 text-sm font-medium">= {value * multiplier}</p>}
    </div>
  )
}
