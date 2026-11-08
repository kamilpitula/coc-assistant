import { useEffect, useRef } from 'react'

import { CreationMethodChoice } from '@/campaign-play/components/creation-method-choice/creation-method-choice'
import { CreationRollAction } from '@/campaign-play/components/creation-roll-action/creation-roll-action'
import { DiceRollInput } from '@/campaign-play/components/dice-roll-input/dice-roll-input'
import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { PointBuyBudgetCounter } from '@/campaign-play/components/point-budget-counter/point-budget-counter'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { WorthCheckingAlert } from '@/campaign-play/components/worth-checking-alert/worth-checking-alert'
import type { RollStatus } from '@/campaign-play/hooks/useWizardMoves'
import { characteristicField, characteristicRollField, luckRollField } from '@/campaign-play/services/characterSheetValidation'
import { errorId, fieldId, groupDescribedBy } from '@/campaign-play/services/fieldIds'
import { optionsFor, valuesLeft } from '@/campaign-play/services/quickFireValues'
import { clearsSkillInputs, hasCharacteristicInputs } from '@/campaign-play/state/characterSheetForm'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import {
  CHARACTERISTIC_CODES,
  type AgeBracket,
  type CharacterSheetRules,
  type CharacterSheetView,
  type CharacteristicCode,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'
import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

interface CharacteristicsStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  bracket: AgeBracket | null
  warnings: ValidationError[]
  /** The Campaign's allowed Creation Methods. */
  allowedMethods: CreationMethod[]
  /** The saved sheet: the Creation Method lock, the legacy typed-in rolls, and the rolled values. */
  sheet: CharacterSheetView
  status: InvestigatorStatus
  /** The characteristics roll and its states (ux.md section 6.8). */
  roll: { status: RollStatus; onRoll: () => void; onRetry: () => void }
}

/**
 * Creation Method and Characteristics: the server roll with its lock under Standard rolling, Point buy values with
 * their budget, or Quick fire Selects, and the Luck rows (specs/character-sheet/ux.md section 6.2; UX-8, UX-9,
 * UX-10, UX-20, UX-31, UX-32, UX-33).
 */
export function CharacteristicsStep(props: CharacteristicsStepProps) {
  const { inputs, errors, warnings, allowedMethods, sheet, status, onAction } = props
  return (
    <div className="flex flex-col gap-6">
      <CreationMethodChoice
        allowed={allowedMethods}
        value={inputs.creationMethod}
        locked={sheet.locks.creationMethod}
        canStartOver={status === 'Draft'}
        needsConfirmation={hasCharacteristicInputs(inputs)}
        clearsSkills={(method) => clearsSkillInputs(inputs, method)}
        error={errors.creationMethod}
        onChange={(method) => onAction({ type: 'creationMethod', method })}
      />

      <WorthCheckingAlert warnings={warnings} />

      {inputs.creationMethod !== null && (
        <fieldset
          id={fieldId('characteristics')}
          tabIndex={-1}
          aria-describedby={groupDescribedBy('characteristics', errors.characteristics)}
          className="flex flex-col gap-3"
        >
          <legend className="mb-2 font-medium">Characteristics</legend>
          {inputs.creationMethod === 'StandardRolling' && <StandardRollingSection {...props} />}
          {inputs.creationMethod === 'PointBuy' && <PointBuyValues {...props} />}
          {inputs.creationMethod === 'QuickFire' && <QuickFireValues {...props} />}
          <FieldGroupError field="characteristics" error={errors.characteristics} />
        </fieldset>
      )}

      <LuckRolls {...props} />
    </div>
  )
}

/** The DOM id of the roll trigger, so error summary links for characteristicRolls.{C} focus it. */
const ROLL_TRIGGER_ID = fieldId('characteristicRolls')
const ROLL_ERROR_ID = errorId('characteristicRolls')

/** "STR, CON (3D6); SIZ (2D6)": the missing characteristics grouped by their dice. */
function rollList(missing: readonly CharacteristicCode[], rules: CharacterSheetRules): string {
  const groups = new Map<string, CharacteristicCode[]>()
  for (const code of missing) {
    const dice = rules.standardRolling[code].dice
    groups.set(dice, [...(groups.get(dice) ?? []), code])
  }

  return [...groups].map(([dice, codes]) => `${codes.join(', ')} (${dice})`).join('; ')
}

function StandardRollingSection({ inputs, errors, rules, sheet, roll }: CharacteristicsStepProps) {
  const missing = CHARACTERISTIC_CODES.filter((code) => (inputs.characteristics[code] ?? null) === null)
  const hasValues = missing.length < CHARACTERISTIC_CODES.length
  const announced = roll.status.state === 'rolled' || roll.status.state === 'alreadyRolled'
  const heading = useRef<HTMLHeadingElement>(null)
  const wasAnnounced = useRef(false)

  useEffect(() => {
    if (announced && !wasAnnounced.current) {
      heading.current?.focus()
    }
    wasAnnounced.current = announced
  }, [announced])

  if (missing.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <h3 ref={heading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
          Your characteristics
        </h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CHARACTERISTIC_CODES.map((code) => (
            <li key={code} className="text-sm">
              {code} {inputs.characteristics[code]}
              {sheet.characteristicRolls[code] !== null && sheet.characteristicRolls[code] !== undefined ? ' (entered by you)' : ''}
            </li>
          ))}
        </ul>
        {announced && (
          <p role="status" className="text-sm">
            {roll.status.state === 'rolled' ? 'Characteristics rolled.' : 'Your characteristics were already rolled.'}
          </p>
        )}
      </div>
    )
  }

  const inlineError = CHARACTERISTIC_CODES.map((code) => errors[characteristicRollField(code)]).find(
    (message) => message !== undefined,
  )

  return (
    <div className="flex flex-col gap-3">
      {!hasValues && (
        <p className="text-sm text-muted-foreground">
          The app rolls each characteristic for you: {rollList(CHARACTERISTIC_CODES, rules)}.
        </p>
      )}
      {hasValues && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CHARACTERISTIC_CODES.filter((code) => (inputs.characteristics[code] ?? null) !== null).map((code) => (
            <li key={code} className="text-sm">
              {code} {inputs.characteristics[code]}
              {sheet.characteristicRolls[code] !== null && sheet.characteristicRolls[code] !== undefined ? ' (entered by you)' : ''}
            </li>
          ))}
        </ul>
      )}
      <CreationRollAction
        id={ROLL_TRIGGER_ID}
        describedBy={inlineError ? ROLL_ERROR_ID : undefined}
        label={hasValues ? 'Roll the remaining characteristics' : 'Roll characteristics'}
        body={`The app rolls ${rollList(missing, rules)} once. You can't roll them again, and you can't change your creation method afterwards.`}
        pending={roll.status.state === 'pending'}
        onRoll={roll.onRoll}
      />
      {inlineError && (
        <p id={ROLL_ERROR_ID} className="text-sm text-destructive">
          {inlineError}
        </p>
      )}
      {roll.status.state === 'saveFailed' && (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
          <AlertDescription>We couldn&apos;t save your Investigator. Your changes are still here - try again.</AlertDescription>
          <Button type="button" variant="outline" className="self-start" onClick={roll.onRoll}>
            Try again
          </Button>
        </Alert>
      )}
      {roll.status.state === 'rollFailed' && (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
          <AlertDescription>We couldn&apos;t roll your characteristics. Try again.</AlertDescription>
          <Button type="button" variant="outline" className="self-start" onClick={roll.onRetry}>
            Try again
          </Button>
        </Alert>
      )}
      {roll.status.state === 'saveConflict' && (
        <Alert role="alert">
          <AlertDescription>Your Investigator changed elsewhere, so we reloaded it.</AlertDescription>
        </Alert>
      )}
      {roll.status.state === 'rollConflict' && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>We couldn&apos;t roll your characteristics. Reload the page and try again.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

function PointBuyValues({ inputs, errors, rules, onAction, onBlur }: CharacteristicsStepProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CHARACTERISTIC_CODES.map((code) => (
          <WizardField
            key={code}
            field={characteristicField(code)}
            label={code}
            type="number"
            value={inputs.characteristics[code] ?? null}
            error={errors[characteristicField(code)]}
            onChange={(value) => onAction({ type: 'characteristic', code, value })}
            onBlur={onBlur}
          />
        ))}
      </div>
      <PointBuyBudgetCounter values={inputs.characteristics} budget={rules.pointBuyBudget} />
    </>
  )
}

function QuickFireValues({ inputs, errors, rules, onAction, onBlur }: CharacteristicsStepProps) {
  const pool = rules.quickFireCharacteristicValues
  const assigned = CHARACTERISTIC_CODES.map((code) => inputs.characteristics[code] ?? null)
  const left = valuesLeft(pool, assigned)
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CHARACTERISTIC_CODES.map((code, index) => (
          <WizardSelect
            key={code}
            field={characteristicField(code)}
            label={code}
            value={assigned[index] === null ? null : String(assigned[index])}
            options={optionsFor(pool, assigned.filter((_, other) => other !== index), assigned[index]).map((value) => ({
              value: String(value),
              label: String(value),
            }))}
            error={errors[characteristicField(code)]}
            onChange={(value) => onAction({ type: 'characteristic', code, value: Number(value) })}
            onBlur={onBlur}
          />
        ))}
      </div>
      <p className="text-sm font-medium">{left.length > 0 ? `Values left to assign: ${left.join(', ')}` : 'Every value is assigned.'}</p>
    </>
  )
}

function LuckRolls({ inputs, errors, rules, bracket, onAction, onBlur }: CharacteristicsStepProps) {
  const rollsTwice = (bracket?.luckRolls ?? 1) >= 2
  const [first, second] = [inputs.luckRolls[0] ?? null, inputs.luckRolls[1] ?? null]
  const kept = rollsTwice && first !== null && second !== null ? Math.max(first, second) * rules.luckMultiplier : null
  const help =
    inputs.creationMethod === 'PointBuy'
      ? `Luck isn't bought with points. Roll ${rules.luckDice} at the table and enter the total.`
      : `Roll ${rules.luckDice} at the table and enter the total.`

  return (
    <section aria-labelledby="luck-heading" className="flex flex-col gap-3">
      <h2 id="luck-heading" className="text-lg font-semibold">
        Luck
      </h2>
      <p className="text-sm text-muted-foreground">{help}</p>
      <DiceRollInput
        field={luckRollField(0)}
        rollLabel="Luck"
        dice={rules.luckDice}
        multiplier={rules.luckMultiplier}
        value={first}
        error={errors[luckRollField(0)]}
        onChange={(value) => onAction({ type: 'luckRoll', index: 0, value })}
        onBlur={onBlur}
      />
      {rollsTwice && (
        <>
          <p className="text-sm text-muted-foreground">Your age lets you roll Luck twice and keep the higher result.</p>
          <DiceRollInput
            field={luckRollField(1)}
            rollLabel="Luck, second roll"
            dice={rules.luckDice}
            multiplier={rules.luckMultiplier}
            value={second}
            error={errors[luckRollField(1)]}
            onChange={(value) => onAction({ type: 'luckRoll', index: 1, value })}
            onBlur={onBlur}
          />
          {kept !== null && <p className="text-sm font-medium">Luck kept: {kept}</p>}
        </>
      )}
    </section>
  )
}
