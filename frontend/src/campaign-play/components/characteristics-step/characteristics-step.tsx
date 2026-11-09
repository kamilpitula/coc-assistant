import { useEffect, useRef } from 'react'

import { CreationMethodChoice } from '@/campaign-play/components/creation-method-choice/creation-method-choice'
import { CreationRollAction } from '@/campaign-play/components/creation-roll-action/creation-roll-action'
import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { PointBuyBudgetCounter } from '@/campaign-play/components/point-budget-counter/point-budget-counter'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { WorthCheckingAlert } from '@/campaign-play/components/worth-checking-alert/worth-checking-alert'
import type { RollStatus } from '@/campaign-play/hooks/useWizardMoves'
import { characteristicField, characteristicRollField } from '@/campaign-play/services/characterSheetValidation'
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
  /** The Luck roll and its states (ux.md section 6.2). */
  luckRoll: { status: RollStatus; onRoll: () => void; onRetry: () => void }
}

/**
 * Creation Method and Characteristics: the server roll with its lock under Standard rolling, Point buy values with
 * their budget, or Quick fire Selects, and the app-rolled Luck (specs/character-sheet/ux.md section 6.2; UX-8, UX-9,
 * UX-10, UX-31, UX-32, UX-33, UX-36, UX-38, G1).
 */
export function CharacteristicsStep(props: CharacteristicsStepProps) {
  const { inputs, errors, warnings, allowedMethods, sheet, status, onAction } = props
  // The method is locked by rolled characteristics, or by a rolled EDU check under Point buy or Quick fire (ux.md 6.2,
  // G1): a method switch would clear EDU, which the EDU lock forbids.
  const methodLocked =
    sheet.locks.creationMethod ||
    (sheet.locks.edu && (inputs.creationMethod === 'PointBuy' || inputs.creationMethod === 'QuickFire'))
  return (
    <div className="flex flex-col gap-6">
      <CreationMethodChoice
        allowed={allowedMethods}
        value={inputs.creationMethod}
        locked={methodLocked}
        lockReason={sheet.locks.creationMethod ? 'characteristics' : 'eduCheck'}
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

      <LuckSection {...props} />
    </div>
  )
}

/** The DOM id of the roll trigger, so error summary links for characteristicRolls.{C} focus it. */
const ROLL_TRIGGER_ID = fieldId('characteristicRolls')
const ROLL_ERROR_ID = errorId('characteristicRolls')

/** True when the sheet keeps a Player-entered Roll Record for the characteristic: a legacy typed-in total. Server rolls never count. */
function enteredByYou(sheet: CharacterSheetView, code: CharacteristicCode): boolean {
  return sheet.rollRecords.some((record) => record.purpose === `Characteristic:${code}` && record.source === 'PlayerEntered')
}

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
              {enteredByYou(sheet, code) ? ' (entered by you)' : ''}
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
              {enteredByYou(sheet, code) ? ' (entered by you)' : ''}
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

function PointBuyValues({ inputs, errors, rules, sheet, onAction, onBlur }: CharacteristicsStepProps) {
  // Under the EDU lock the EDU input is disabled and carries the reason (ux.md 6.8).
  const eduLocked = sheet.locks.edu
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
            disabled={code === 'EDU' && eduLocked}
            help={code === 'EDU' && eduLocked ? 'Locked because you rolled an EDU check.' : undefined}
            onChange={(value) => onAction({ type: 'characteristic', code, value })}
            onBlur={onBlur}
          />
        ))}
      </div>
      <PointBuyBudgetCounter values={inputs.characteristics} budget={rules.pointBuyBudget} />
    </>
  )
}

function QuickFireValues({ inputs, errors, rules, sheet, onAction, onBlur }: CharacteristicsStepProps) {
  const pool = rules.quickFireCharacteristicValues
  const assigned = CHARACTERISTIC_CODES.map((code) => inputs.characteristics[code] ?? null)
  const left = valuesLeft(pool, assigned)
  // Under the EDU lock the EDU Select is replaced by text with the reason (ux.md 6.8).
  const eduLocked = sheet.locks.edu
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CHARACTERISTIC_CODES.map((code, index) => (
          code === 'EDU' && eduLocked ? (
            <div key={code} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">EDU</span>
              <span className="text-sm">EDU {assigned[index] === null ? 'has no value' : assigned[index]}</span>
              <span className="text-sm text-muted-foreground">Locked because you rolled an EDU check.</span>
            </div>
          ) : (
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
          )
        ))}
      </div>
      <p className="text-sm font-medium">{left.length > 0 ? `Values left to assign: ${left.join(', ')}` : 'Every value is assigned.'}</p>
    </>
  )
}

/** The DOM id of the Luck roll trigger, so error summary links for luckRolls[*] focus it. */
const LUCK_TRIGGER_ID = fieldId('luckRolls')
const LUCK_ERROR_ID = errorId('luckRolls')
/** The DOM id of the Luck heading, focused when there is no roll action. */
const LUCK_HEADING_ID = fieldId('luckHeading')

/** True when the sheet keeps a Player-entered Roll Record for the purpose: a legacy typed-in total. Server rolls never count. */
function enteredLuckByYou(sheet: CharacterSheetView, purpose: string): boolean {
  return sheet.rollRecords.some((record) => record.purpose === purpose && record.source === 'PlayerEntered')
}

/**
 * Luck, rolled by the app (specs/character-sheet/ux.md section 6.2): the roll action with its dialog until the rolls
 * exist, then the values; typed-in Luck from before the dice system reads "(entered by you)" (UX-36, G2).
 */
function LuckSection({ rules, bracket, errors, sheet, luckRoll }: CharacteristicsStepProps) {
  const [first, second] = [sheet.luckRolls[0] ?? null, sheet.luckRolls[1] ?? null]
  const rollsTwice = (bracket?.luckRolls ?? 1) >= 2
  const announced = luckRoll.status.state === 'rolled' || luckRoll.status.state === 'alreadyRolled'
  const heading = useRef<HTMLHeadingElement>(null)
  const wasAnnounced = useRef(false)

  useEffect(() => {
    if (announced && !wasAnnounced.current) {
      heading.current?.focus()
    }
    wasAnnounced.current = announced
  }, [announced])

  const valueOf = (roll: number): number => roll * rules.luckMultiplier
  const marked = (roll: number, purpose: string): string =>
    `${valueOf(roll)}${enteredLuckByYou(sheet, purpose) ? ' (entered by you)' : ''}`
  const inlineError = errors['luckRolls[0]'] ?? errors['luckRolls[1]']

  return (
    <section aria-labelledby={LUCK_HEADING_ID} className="flex flex-col gap-3">
      <h2 id={LUCK_HEADING_ID} ref={heading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
        Luck
      </h2>
      {bracket === null && (
        <p className="text-sm text-muted-foreground">Enter a valid age on the Identity step to roll Luck.</p>
      )}
      {bracket !== null && first !== null && second !== null && (
        <p className="text-sm">
          Luck rolls {marked(first, 'Luck')} and {marked(second, 'Luck:SecondRoll')}, kept{' '}
          {valueOf(Math.max(first, second))}
        </p>
      )}
      {bracket !== null && first !== null && second === null && (
        <p className="text-sm">
          Luck {marked(first, 'Luck')}
        </p>
      )}
      {bracket !== null && (first === null || (second === null && rollsTwice)) && (
        <LuckRollAction
          rules={rules}
          bracket={bracket}
          secondOnly={first !== null}
          inlineError={inlineError}
          luckRoll={luckRoll}
        />
      )}
      {bracket !== null && inlineError && second !== null && (
        <p id={LUCK_ERROR_ID} className="text-sm text-destructive">
          {inlineError}
        </p>
      )}
      {announced && (
        <p role="status" className="text-sm">
          {luckRoll.status.state === 'rolled' ? 'Luck rolled.' : 'Your Luck was already rolled.'}
        </p>
      )}
    </section>
  )
}

/** The Luck roll action with the Luck copy of the 6.8 failures (ux.md sections 6.2 and 6.8). */
function LuckRollAction({
  rules,
  bracket,
  secondOnly,
  inlineError,
  luckRoll,
}: {
  rules: CharacterSheetRules
  bracket: AgeBracket
  /** True when only a typed-in first roll exists in the two-roll bracket: the action rolls just the second. */
  secondOnly: boolean
  inlineError: string | undefined
  luckRoll: CharacteristicsStepProps['luckRoll']
}) {
  const range = `your age must then stay between ${bracket.minimumAge} and ${bracket.maximumAge}`
  const label = secondOnly ? 'Roll your second Luck roll' : 'Roll Luck'
  const body = secondOnly
    ? `The app rolls your second Luck roll (${rules.luckDice}) once, keeping the higher result. You can't roll it again, and ${range}.`
    : `The app rolls Luck (${rules.luckDice}) ${bracket.luckRolls >= 2 ? 'twice at your age, keeping the higher result' : 'once'}. You can't roll it again, and ${range}.`

  return (
    <div className="flex flex-col gap-2">
      <CreationRollAction
        id={LUCK_TRIGGER_ID}
        describedBy={inlineError ? LUCK_ERROR_ID : undefined}
        label={label}
        body={body}
        pending={luckRoll.status.state === 'pending'}
        onRoll={luckRoll.onRoll}
      />
      {inlineError && (
        <p id={LUCK_ERROR_ID} className="text-sm text-destructive">
          {inlineError}
        </p>
      )}
      {luckRoll.status.state === 'saveFailed' && (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
          <AlertDescription>We couldn&apos;t save your Investigator. Your changes are still here - try again.</AlertDescription>
          <Button type="button" variant="outline" className="self-start" onClick={luckRoll.onRoll}>
            Try again
          </Button>
        </Alert>
      )}
      {luckRoll.status.state === 'rollFailed' && (
        <Alert variant="destructive" role="alert" className="flex flex-col gap-2">
          <AlertDescription>We couldn&apos;t roll your Luck. Try again.</AlertDescription>
          <Button type="button" variant="outline" className="self-start" onClick={luckRoll.onRetry}>
            Try again
          </Button>
        </Alert>
      )}
      {luckRoll.status.state === 'saveConflict' && (
        <Alert role="alert">
          <AlertDescription>Your Investigator changed elsewhere, so we reloaded it.</AlertDescription>
        </Alert>
      )}
      {luckRoll.status.state === 'rollConflict' && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>We couldn&apos;t roll your Luck. Reload the page and try again.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
