import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { deductionField, eduCheckField } from '@/campaign-play/services/characterSheetValidation'
import { fieldId, groupDescribedBy } from '@/campaign-play/services/fieldIds'
import { eduBeforeEachCheck } from '@/campaign-play/state/characterSheetForm'
import type { AgeBracket, CharacterSheetRules, EduImprovementCheckInputs } from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'

interface AgeEffectsStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  bracket: AgeBracket | null
}

function joinWithOr(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
}

function joinWithAnd(parts: string[]): string {
  if (parts.length < 2) {
    return parts.join('')
  }
  const separator = parts.length > 2 ? ', and ' : ' and '
  return `${parts.slice(0, -1).join(', ')}${separator}${parts[parts.length - 1]}`
}

/** The intro line of ux.md section 6.3, built only from the bracket's rule data. */
function ageEffectsIntro(age: number, bracket: AgeBracket): string {
  const parts = [
    bracket.physicalDeductionTotal > 0
      ? `you lose ${bracket.physicalDeductionTotal} points from ${joinWithOr(bracket.physicalDeductionCharacteristics)}`
      : null,
    bracket.appearanceModifier < 0 ? `APP is reduced by ${-bracket.appearanceModifier}` : null,
    bracket.eduImprovementChecks > 0
      ? `you make ${bracket.eduImprovementChecks} EDU ${bracket.eduImprovementChecks === 1 ? 'check' : 'checks'}`
      : null,
  ].filter((part): part is string => part !== null)

  return `At age ${age} ${joinWithAnd(parts)}.`
}

/** Age effects: the deduction split and the EDU improvement checks (specs/character-sheet/ux.md section 6.3). */
export function AgeEffectsStep({ inputs, errors, rules, bracket, onAction, onBlur }: AgeEffectsStepProps) {
  if (!bracket || inputs.identity.age === null) {
    return <p className="text-sm">Your age effects appear once a valid age is saved on the Identity step.</p>
  }

  const checks = Array.from(
    { length: bracket.eduImprovementChecks },
    (_, index): EduImprovementCheckInputs => inputs.ageEffects.eduImprovementChecks[index] ?? { check: null, gain: null },
  )
  const eduBefore = eduBeforeEachCheck(inputs.characteristics.EDU ?? null, checks, rules.eduMaximum)

  return (
    <div className="flex flex-col gap-6">
      <p>{ageEffectsIntro(inputs.identity.age, bracket)}</p>
      {bracket.physicalDeductionTotal > 0 && (
        <DeductionSplit inputs={inputs} errors={errors} bracket={bracket} onAction={onAction} onBlur={onBlur} />
      )}
      {checks.map((check, index) => (
        <EduCheckGroup
          key={index}
          index={index}
          count={checks.length}
          check={check}
          eduBefore={eduBefore[index]}
          rules={rules}
          errors={errors}
          onAction={onAction}
          onBlur={onBlur}
        />
      ))}
    </div>
  )
}

type DeductionSplitProps = Omit<AgeEffectsStepProps, 'rules'> & { bracket: AgeBracket }

function DeductionSplit({ inputs, errors, bracket, onAction, onBlur }: DeductionSplitProps) {
  const deducted = bracket.physicalDeductionCharacteristics.reduce(
    (sum, code) => sum + (inputs.ageEffects.deductions[code] ?? 0),
    0,
  )
  const groupField = 'ageEffects.deductions'

  return (
    <fieldset
      id={fieldId(groupField)}
      tabIndex={-1}
      aria-describedby={groupDescribedBy(groupField, errors[groupField])}
      className="flex flex-col gap-3"
    >
      <legend className="mb-2 font-medium">Deduction split</legend>
      <div className="flex flex-wrap gap-4">
        {bracket.physicalDeductionCharacteristics.map((code) => {
          const assigned = inputs.characteristics[code] ?? null
          const deduction = inputs.ageEffects.deductions[code] ?? null
          return (
            <div key={code} className="flex flex-col gap-1">
              <WizardField
                field={deductionField(code)}
                label={`Deduct from ${code}`}
                type="number"
                value={deduction}
                error={errors[deductionField(code)]}
                onChange={(value) => onAction({ type: 'deduction', code, value })}
                onBlur={onBlur}
                className="w-36"
              />
              {assigned !== null && (
                <span className="text-sm text-muted-foreground">
                  {code} {assigned} -&gt; {assigned - (deduction ?? 0)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-sm font-medium">Still to deduct: {bracket.physicalDeductionTotal - deducted}</p>
      <FieldGroupError field={groupField} error={errors[groupField]} />
    </fieldset>
  )
}

interface EduCheckGroupProps {
  index: number
  count: number
  check: EduImprovementCheckInputs
  eduBefore: number | null
  rules: CharacterSheetRules
  errors: Record<string, string>
  onAction: WizardStepProps['onAction']
  onBlur: WizardStepProps['onBlur']
}

function EduCheckGroup({ index, count, check, eduBefore, rules, errors, onAction, onBlur }: EduCheckGroupProps) {
  const groupField = eduCheckField(index)
  const improves = check.check !== null && eduBefore !== null && check.check > eduBefore
  const result =
    improves && check.gain !== null && eduBefore !== null
      ? `EDU ${eduBefore} -> ${Math.min(rules.eduMaximum, eduBefore + check.gain)}`
      : check.check !== null && !improves
        ? 'No improvement'
        : null

  return (
    <fieldset
      id={fieldId(groupField)}
      tabIndex={-1}
      aria-describedby={groupDescribedBy(groupField, errors[groupField])}
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <legend className="px-1 font-medium">
        EDU check {index + 1} of {count}
      </legend>
      <div className="flex flex-wrap gap-4">
        <WizardField
          field={`${groupField}.check`}
          label={`${rules.eduImprovementCheckDice} roll`}
          type="number"
          value={check.check}
          error={errors[`${groupField}.check`]}
          onChange={(value) => onAction({ type: 'eduCheck', index, part: 'check', value })}
          onBlur={onBlur}
          className="w-36"
        />
        {improves && (
          <WizardField
            field={`${groupField}.gain`}
            label={`${rules.eduImprovementGainDice} gain`}
            type="number"
            value={check.gain}
            error={errors[`${groupField}.gain`]}
            onChange={(value) => onAction({ type: 'eduCheck', index, part: 'gain', value })}
            onBlur={onBlur}
            className="w-36"
          />
        )}
      </div>
      {result && <p className="text-sm font-medium">{result}</p>}
      <FieldGroupError field={groupField} error={errors[groupField]} />
    </fieldset>
  )
}
