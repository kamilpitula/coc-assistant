import { useState } from 'react'

import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { PointsLeftCounter } from '@/campaign-play/components/points-left-counter/points-left-counter'
import { SkillAllocationTable, type SkillAllocationRow } from '@/campaign-play/components/skill-allocation-table/skill-allocation-table'
import { SkillPicker } from '@/campaign-play/components/skill-picker/skill-picker'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { openSlotsOf, selectedCatalogOccupation } from '@/campaign-play/services/occupationSkills'
import { optionsFor, valuesLeft } from '@/campaign-play/services/quickFireValues'
import { pointsField, skillTableEntries, skillTotal, type SkillTableEntry } from '@/campaign-play/services/skillTableEntries'
import { skillDisplayName } from '@/campaign-play/services/skillValidation'
import { sameSkill } from '@/campaign-play/state/characterSheetForm'
import type { CharacterSheetInputs, CharacterSheetRules, CharacterSheetView, SkillReference } from '@/campaign-play/types/CharacterSheet'
import type { OccupationCatalog, SkillCatalog } from '@/campaign-play/types/RuleData'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'

export interface SkillStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  /** The saved sheet: its budgets, skill bases, and occupation as the server computed them. */
  sheet: CharacterSheetView
  occupationCatalog: OccupationCatalog
  skillCatalog: SkillCatalog
}

function nameOf(skill: SkillReference): string {
  return skillDisplayName(skill.skill, skill.specialization)
}

/**
 * Occupation skills (specs/character-sheet/ux.md sections 6.5 and 6.5a): the choice controls for the occupation's open
 * slots, then the skill-allocation-table with Credit Rating first, and the occupation points left. Quick fire assigns
 * its values with Selects instead (docs/game-rules section 18).
 */
export function OccupationSkillsStep(props: SkillStepProps) {
  const { inputs, errors, rules, sheet, occupationCatalog, skillCatalog, onBlur } = props
  const [announcement, setAnnouncement] = useState('')
  const quickFire = inputs.creationMethod === 'QuickFire'
  const entries = skillTableEntries(sheet, inputs, skillCatalog, occupationCatalog, [])
  const creditRating = entries.find((entry) => entry.skill.skill === rules.creditRatingSkill) ?? {
    skill: { skill: rules.creditRatingSkill, specialization: null },
    base: null,
    isOccupationSkill: false,
  }
  const occupationEntries = entries.filter((entry) => entry.isOccupationSkill)
  const budget = sheet.derived.occupationPoints?.budget ?? null
  const spent = inputs.skills.reduce((sum, allocation) => sum + (allocation.occupationPoints ?? 0), 0)

  const announceBudget = (field: string, nextFocus: EventTarget | null) => {
    if (budget !== null) {
      setAnnouncement(`${budget - spent} occupation points left`)
    }
    onBlur(field, nextFocus)
  }

  const rows = [creditRating, ...occupationEntries].map((entry) =>
    quickFire ? quickFireRow(entry, props) : pointsRow(entry, props, announceBudget),
  )

  return (
    <div className="flex flex-col gap-6">
      <SlotChoices {...props} />
      <SkillAllocationTable caption="Occupation skills" controlHeading={quickFire ? 'Quick fire value' : 'Points'} rows={rows} />
      {quickFire ? <QuickFireSummary {...props} /> : <PointsLeftCounter label="Occupation points" budget={budget} spent={spent} />}
      <FieldGroupError field="occupationPoints" error={errors.occupationPoints} />
      <FieldGroupError field="quickFire.values" error={errors['quickFire.values']} />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}

function SlotChoices({ inputs, errors, occupationCatalog, skillCatalog, onAction, onBlur }: SkillStepProps) {
  const occupation = selectedCatalogOccupation(inputs.occupation, occupationCatalog)
  if (occupation === null) {
    return null
  }

  return (
    <section aria-label="Skill choices" className="flex flex-col gap-4">
      {openSlotsOf(occupation, occupationCatalog).map((slot) => {
        const picks = inputs.occupation?.skillChoices[slot.index] ?? []
        const slotField = `occupation.skillChoices[${slot.index}]`
        return (
          <div key={slot.index} className="flex flex-col gap-2">
            {Array.from({ length: slot.needed }, (_, pick) => {
              const value = picks[pick] ?? (slot.specializationOnly && slot.options ? slot.options[0] : null)
              return (
                <SkillPicker
                  key={pick}
                  field={`${slotField}[${pick}]`}
                  label={slot.needed === 1 ? slot.label : `${slot.label}, pick ${pick + 1}`}
                  value={value}
                  options={slot.options ?? undefined}
                  specializationOnly={slot.specializationOnly}
                  skillCatalog={skillCatalog}
                  errors={errors}
                  onChange={(skill) => {
                    const next: (SkillReference | null)[] = Array.from({ length: Math.max(picks.length, pick + 1) }, (_, other) => picks[other] ?? null)
                    next[pick] = skill
                    onAction({ type: 'skillChoice', slot: slot.index, picks: next.filter((candidate): candidate is SkillReference => candidate !== null) })
                  }}
                  onBlur={onBlur}
                />
              )
            })}
            <FieldGroupError field={slotField} error={errors[slotField]} />
          </div>
        )
      })}
    </section>
  )
}

function creditRatingHint({ inputs, sheet }: SkillStepProps): string | undefined {
  const occupation = sheet.occupation
  if (inputs.creationMethod === 'QuickFire') {
    return occupation?.quickFireCreditRating ? `Must be ${occupation.quickFireCreditRating.value} for this occupation` : undefined
  }

  return occupation?.creditRatingMin !== null && occupation?.creditRatingMin !== undefined && occupation.creditRatingMax !== null
    ? `Must be between ${occupation.creditRatingMin} and ${occupation.creditRatingMax}`
    : undefined
}

function pointsRow(entry: SkillTableEntry, props: SkillStepProps, onBlur: (field: string, nextFocus: EventTarget | null) => void): SkillAllocationRow {
  const { inputs, errors, rules, onAction } = props
  const name = nameOf(entry.skill)
  const field = pointsField(inputs, entry.skill, 'occupationPoints')
  const isCreditRating = entry.skill.skill === rules.creditRatingSkill
  const allocation = inputs.skills.find((candidate) => sameSkill(candidate, entry.skill))
  return {
    key: name,
    name,
    hint: isCreditRating ? creditRatingHint(props) : undefined,
    base: entry.base,
    total: skillTotal(entry.base, inputs, entry.skill, rules.quickFirePersonalInterestBonus),
    control: (
      <WizardField
        field={field}
        label={`${name}, occupation points`}
        hideLabel
        type="number"
        value={allocation?.occupationPoints ?? null}
        error={errors[field] ?? (isCreditRating ? errors.creditRating : undefined)}
        onChange={(value) => onAction({ type: 'skillPoints', skill: entry.skill, column: 'occupationPoints', value })}
        onBlur={onBlur}
        className="w-28"
      />
    ),
  }
}

function assignedValues(inputs: CharacterSheetInputs): (number | null)[] {
  return inputs.quickFire.values.map((value) => value.value)
}

function quickFireRow(entry: SkillTableEntry, props: SkillStepProps): SkillAllocationRow {
  const { inputs, errors, rules, sheet, onAction, onBlur } = props
  const name = nameOf(entry.skill)
  const index = inputs.quickFire.values.findIndex((value) => sameSkill(value, entry.skill))
  const own = index >= 0 ? inputs.quickFire.values[index].value : null
  const isCreditRating = entry.skill.skill === rules.creditRatingSkill
  const elsewhere = assignedValues(inputs).filter((_, other) => other !== index)
  const creditRatingValue = sheet.occupation?.quickFireCreditRating?.value
  const options = [
    ...(isCreditRating && creditRatingValue !== undefined && !rules.quickFireSkillValues.includes(creditRatingValue) ? [creditRatingValue] : []),
    ...optionsFor(rules.quickFireSkillValues, elsewhere, own),
  ]
  const field = index >= 0 ? `quickFire.values[${index}].value` : `quickFireRows.${name}.value`
  return {
    key: name,
    name,
    hint: isCreditRating ? creditRatingHint(props) : undefined,
    base: entry.base,
    total: skillTotal(entry.base, inputs, entry.skill, rules.quickFirePersonalInterestBonus) ?? own,
    control: (
      <WizardSelect
        field={field}
        label={`${name}, Quick fire value`}
        hideLabel
        value={own === null ? null : String(own)}
        options={[...new Set(options)].map((value) => ({ value: String(value), label: String(value) }))}
        error={errors[field] ?? (isCreditRating ? errors.creditRating : undefined)}
        onChange={(value) => onAction({ type: 'quickFireValue', skill: entry.skill, value: Number(value) })}
        onBlur={onBlur}
        className="w-28"
      />
    ),
  }
}

function QuickFireSummary(props: SkillStepProps) {
  const { inputs, rules, sheet, occupationCatalog, skillCatalog, errors, onAction, onBlur } = props
  const left = valuesLeft(rules.quickFireSkillValues, assignedValues(inputs))
  const freed = sheet.occupation?.quickFireCreditRating?.freedValue ?? null
  const occupationSkills = skillTableEntries(sheet, inputs, skillCatalog, occupationCatalog, []).filter((entry) => entry.isOccupationSkill)
  const extra = inputs.quickFire.values.find(
    (value) => value.skill !== rules.creditRatingSkill && !occupationSkills.some((entry) => sameSkill(entry.skill, value)),
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{left.length > 0 ? `Values left to assign: ${left.join(', ')}` : 'Every value is assigned.'}</p>
      {freed !== null && (
        <div className="flex flex-col gap-1">
          <SkillPicker
            field="quickFire.extraSkill"
            label={`Extra skill for the freed ${freed}`}
            value={extra ? { skill: extra.skill, specialization: extra.specialization } : null}
            skillCatalog={skillCatalog}
            errors={errors}
            onChange={(skill) => {
              if (extra) {
                onAction({ type: 'quickFireValue', skill: extra, value: null })
              }
              if (skill) {
                onAction({ type: 'quickFireValue', skill, value: freed })
              }
            }}
            onBlur={onBlur}
          />
          <p className="text-sm text-muted-foreground">
            Your Credit Rating doesn&apos;t use a Quick fire value, so the freed {freed} goes to one more skill of your choice.
          </p>
        </div>
      )}
    </div>
  )
}
