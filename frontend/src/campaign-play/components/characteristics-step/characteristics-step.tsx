import { CreationMethodChoice } from '@/campaign-play/components/creation-method-choice/creation-method-choice'
import { DiceRollInput } from '@/campaign-play/components/dice-roll-input/dice-roll-input'
import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { PointBuyBudgetCounter } from '@/campaign-play/components/point-budget-counter/point-budget-counter'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { WorthCheckingAlert } from '@/campaign-play/components/worth-checking-alert/worth-checking-alert'
import { characteristicField, characteristicRollField, luckRollField } from '@/campaign-play/services/characterSheetValidation'
import { fieldId, groupDescribedBy } from '@/campaign-play/services/fieldIds'
import { optionsFor, valuesLeft } from '@/campaign-play/services/quickFireValues'
import { clearsSkillInputs, hasCharacteristicInputs } from '@/campaign-play/state/characterSheetForm'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import {
  CHARACTERISTIC_CODES,
  type AgeBracket,
  type CharacterSheetRules,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'

interface CharacteristicsStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  bracket: AgeBracket | null
  warnings: ValidationError[]
  /** The Campaign's allowed Creation Methods. */
  allowedMethods: CreationMethod[]
}

/**
 * Creation Method and Characteristics: Standard rolling dice rows, Point buy values with their budget, or Quick fire
 * Selects, and the Luck rows (specs/character-sheet/ux.md section 6.2; UX-8, UX-9, UX-10, UX-20).
 */
export function CharacteristicsStep(props: CharacteristicsStepProps) {
  const { inputs, errors, warnings, allowedMethods, onAction } = props
  return (
    <div className="flex flex-col gap-6">
      <CreationMethodChoice
        allowed={allowedMethods}
        value={inputs.creationMethod}
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
          {inputs.creationMethod === 'StandardRolling' && <StandardRollingRows {...props} />}
          {inputs.creationMethod === 'PointBuy' && <PointBuyValues {...props} />}
          {inputs.creationMethod === 'QuickFire' && <QuickFireValues {...props} />}
          <FieldGroupError field="characteristics" error={errors.characteristics} />
        </fieldset>
      )}

      <LuckRolls {...props} />
    </div>
  )
}

function StandardRollingRows({ inputs, errors, rules, onAction, onBlur }: CharacteristicsStepProps) {
  return (
    <div className="flex flex-col gap-3">
      {CHARACTERISTIC_CODES.map((code) => (
        <DiceRollInput
          key={code}
          field={characteristicRollField(code)}
          rollLabel={code}
          dice={rules.standardRolling[code].dice}
          bonus={rules.standardRolling[code].bonus}
          multiplier={rules.standardRolling[code].multiplier}
          value={inputs.characteristicRolls[code] ?? null}
          error={errors[characteristicRollField(code)]}
          onChange={(value) => onAction({ type: 'characteristicRoll', code, value })}
          onBlur={onBlur}
        />
      ))}
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
