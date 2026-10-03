import { TriangleAlert } from 'lucide-react'

import { creationMethodLabels } from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import { DiceRollInput } from '@/campaign-play/components/dice-roll-input/dice-roll-input'
import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { PointBuyBudgetCounter } from '@/campaign-play/components/point-budget-counter/point-budget-counter'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { characteristicField, luckRollField } from '@/campaign-play/services/characterSheetValidation'
import { fieldId, groupDescribedBy } from '@/campaign-play/services/fieldIds'
import {
  CHARACTERISTIC_CODES,
  type AgeBracket,
  type CharacterSheetRules,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'

interface CharacteristicsStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  bracket: AgeBracket | null
  warnings: ValidationError[]
}

/**
 * Creation Method and Characteristics for Point buy, with the Luck rows below the points
 * (specs/character-sheet/ux.md section 6.2; UX-10, UX-20).
 */
export function CharacteristicsStep({ inputs, errors, rules, bracket, warnings, onAction, onBlur }: CharacteristicsStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">Creation method: {creationMethodLabels.PointBuy.name}</p>

      {warnings.length > 0 && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Worth checking</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {warnings.map((warning) => (
                <li key={`${warning.field}-${warning.code}`}>{warning.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <fieldset
        id={fieldId('characteristics')}
        tabIndex={-1}
        aria-describedby={groupDescribedBy('characteristics', errors.characteristics)}
        className="flex flex-col gap-3"
      >
        <legend className="mb-2 font-medium">Characteristics</legend>
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
        <FieldGroupError field="characteristics" error={errors.characteristics} />
      </fieldset>

      <LuckRolls inputs={inputs} errors={errors} rules={rules} bracket={bracket} onAction={onAction} onBlur={onBlur} />
    </div>
  )
}

type LuckRollsProps = Omit<CharacteristicsStepProps, 'warnings'>

function LuckRolls({ inputs, errors, rules, bracket, onAction, onBlur }: LuckRollsProps) {
  const rollsTwice = (bracket?.luckRolls ?? 1) >= 2
  const [first, second] = [inputs.luckRolls[0] ?? null, inputs.luckRolls[1] ?? null]
  const kept = rollsTwice && first !== null && second !== null ? Math.max(first, second) * rules.luckMultiplier : null

  return (
    <section aria-labelledby="luck-heading" className="flex flex-col gap-3">
      <h2 id="luck-heading" className="text-lg font-semibold">
        Luck
      </h2>
      <p className="text-sm text-muted-foreground">
        Luck isn&apos;t bought with points. Roll {rules.luckDice} at the table and enter the total.
      </p>
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
