import { CircleAlert } from 'lucide-react'
import { useId, useState } from 'react'

import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { PointsLeftCounter } from '@/campaign-play/components/points-left-counter/points-left-counter'
import { SkillAllocationTable, type SkillAllocationRow } from '@/campaign-play/components/skill-allocation-table/skill-allocation-table'
import { SkillPicker } from '@/campaign-play/components/skill-picker/skill-picker'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { errorId, fieldId } from '@/campaign-play/services/fieldIds'
import { occupationRowsOf, openSlotsOf, selectedCatalogOccupation, type OccupationRow } from '@/campaign-play/services/occupationSkills'
import { optionsFor, valuesLeft } from '@/campaign-play/services/quickFireValues'
import { pointsField, skillTableEntries, skillTotal } from '@/campaign-play/services/skillTableEntries'
import { skillDisplayName } from '@/campaign-play/services/skillValidation'
import { sameSkill } from '@/campaign-play/state/characterSheetForm'
import type { CharacterSheetRules, CharacterSheetView, SkillReference } from '@/campaign-play/types/CharacterSheet'
import type { OccupationCatalog, SkillCatalog } from '@/campaign-play/types/RuleData'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'
import { Button } from '@/shared/components/ui/button'

export interface SkillStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  /** The saved sheet: its budgets, skill bases, and occupation as the server computed them. */
  sheet: CharacterSheetView
  occupationCatalog: OccupationCatalog
  skillCatalog: SkillCatalog
}

/** The Select option that clears a Quick fire value (ux.md section 6.5a; UX-23). */
const NO_VALUE = 'none'
const NO_VALUE_LABEL = 'No value'
const UNCHOSEN_HINT = 'Choose this skill above first'

function nameOf(skill: SkillReference): string {
  return skillDisplayName(skill.skill, skill.specialization)
}

/** What the "2. Assign values" table needs for its rows. */
interface ValueContext {
  props: SkillStepProps
  baseOf: (skill: SkillReference) => number | null
  /** The pool the occupation skill rows share: the Quick fire skill values less the freed value (section 18). */
  rowPool: number[]
  onPointsBlur: (field: string, nextFocus: EventTarget | null) => void
}

/**
 * Occupation skills (specs/character-sheet/ux.md sections 6.5 and 6.5a, option A): "1. Make your skill choices", then
 * "2. Assign values" with Credit Rating first, a row per occupation skill slot in catalog order (disabled until its
 * skill is chosen), and, with Quick fire, the extra skill for a freed value; skills that are no longer occupation
 * skills but still hold points or a value are listed under "No longer occupation skills" with "Remove value".
 */
export function OccupationSkillsStep(props: SkillStepProps) {
  const { inputs, errors, rules, sheet, occupationCatalog, skillCatalog, onBlur } = props
  const [announcement, setAnnouncement] = useState('')
  const quickFire = inputs.creationMethod === 'QuickFire'
  const freed = quickFire ? (sheet.occupation?.quickFireCreditRating?.freedValue ?? null) : null
  const extraSkill = quickFire ? (inputs.quickFire.extraSkill ?? null) : null
  const occupationRows = occupationRowsOf(inputs.occupation, occupationCatalog, rules.customOccupationSkillCount)
  const entries = skillTableEntries(sheet, inputs, skillCatalog, occupationCatalog, extraSkill ? [extraSkill] : [])
  const budget = sheet.derived.occupationPoints?.budget ?? null
  const spent = inputs.skills.reduce((sum, allocation) => sum + (allocation.occupationPoints ?? 0), 0)

  const context: ValueContext = {
    props,
    baseOf: (skill) => entries.find((entry) => sameSkill(entry.skill, skill))?.base ?? null,
    rowPool: withoutOne(rules.quickFireSkillValues, freed),
    onPointsBlur: (field, nextFocus) => {
      if (budget !== null) {
        setAnnouncement(`${budget - spent} occupation points left`)
      }
      onBlur(field, nextFocus)
    },
  }

  const rows = [
    valueRow({ skill: rules.creditRatingSkill, specialization: null }, context),
    ...occupationRows.map((row, index) => (row.kind === 'skill' ? valueRow(row.skill, context) : unchosenRow(row, index, quickFire))),
    ...(freed === null ? [] : [extraRow(freed, extraSkill, context)]),
  ]

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="skill-choices-heading" className="flex flex-col gap-4">
        <h2 id="skill-choices-heading" className="text-lg font-semibold">
          1. Make your skill choices
        </h2>
        <SlotChoices {...props} />
      </section>

      <section aria-labelledby="assign-values-heading" className="flex flex-col gap-4">
        <h2 id="assign-values-heading" className="text-lg font-semibold">
          2. Assign values
        </h2>
        <SkillAllocationTable caption="Occupation skills" controlHeading={quickFire ? 'Quick fire value' : 'Points'} rows={rows} />
        {quickFire ? (
          <ValuesLeft pool={context.rowPool} assigned={inputs.quickFire.values.map((value) => value.value)} />
        ) : (
          <PointsLeftCounter label="Occupation points" budget={budget} spent={spent} />
        )}
        <FieldGroupError field="occupationPoints" error={errors.occupationPoints} />
        <FieldGroupError field="quickFire.values" error={errors['quickFire.values']} />
        <LeftOverSkills {...props} occupationRows={occupationRows} />
      </section>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}

/** The pool without one of the value (the freed value is reserved for the extra skill). */
function withoutOne(pool: number[], value: number | null): number[] {
  const index = value === null ? -1 : pool.indexOf(value)
  return index < 0 ? pool : [...pool.slice(0, index), ...pool.slice(index + 1)]
}

function ValuesLeft({ pool, assigned }: { pool: number[]; assigned: (number | null)[] }) {
  const left = valuesLeft(pool, assigned)
  return <p className="text-sm font-medium">{left.length > 0 ? `Values left to assign: ${left.join(', ')}` : 'Every value is assigned.'}</p>
}

function SlotChoices({ inputs, errors, occupationCatalog, skillCatalog, onAction, onBlur }: SkillStepProps) {
  const occupation = selectedCatalogOccupation(inputs.occupation, occupationCatalog)
  if (occupation === null) {
    return <p className="text-sm text-muted-foreground">Your occupation has no skills to choose.</p>
  }

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  )
}

function creditRatingHint({ inputs, sheet }: SkillStepProps): string | undefined {
  const occupation = sheet.occupation
  if (inputs.creationMethod === 'QuickFire') {
    return occupation?.quickFireCreditRating ? `Must be ${occupation.quickFireCreditRating.value} for this occupation` : undefined
  }

  return occupation?.creditRatingMin != null && occupation.creditRatingMax != null
    ? `Must be between ${occupation.creditRatingMin} and ${occupation.creditRatingMax}`
    : undefined
}

function valueRow(skill: SkillReference, context: ValueContext): SkillAllocationRow {
  const { props, baseOf } = context
  const name = nameOf(skill)
  const base = baseOf(skill)
  const isCreditRating = skill.skill === props.rules.creditRatingSkill
  return {
    key: name,
    name,
    hint: isCreditRating ? creditRatingHint(props) : undefined,
    base,
    total: skillTotal(base, props.inputs, skill, props.rules.quickFirePersonalInterestBonus),
    control: props.inputs.creationMethod === 'QuickFire' ? quickFireSelect(skill, isCreditRating, context) : pointsInput(skill, isCreditRating, context),
  }
}

function pointsInput(skill: SkillReference, isCreditRating: boolean, { props, onPointsBlur }: ValueContext) {
  const { inputs, errors, onAction } = props
  const field = pointsField(inputs, skill, 'occupationPoints')
  const allocation = inputs.skills.find((candidate) => sameSkill(candidate, skill))
  return (
    <WizardField
      field={field}
      label={`${nameOf(skill)}, occupation points`}
      hideLabel
      type="number"
      value={allocation?.occupationPoints ?? null}
      error={errors[field] ?? (isCreditRating ? errors.creditRating : undefined)}
      onChange={(value) => onAction({ type: 'skillPoints', skill, column: 'occupationPoints', value })}
      onBlur={onPointsBlur}
      className="w-28"
    />
  )
}

function quickFireSelect(skill: SkillReference, isCreditRating: boolean, { props, rowPool }: ValueContext) {
  const { inputs, errors, rules, sheet, onAction, onBlur } = props
  const name = nameOf(skill)
  const index = inputs.quickFire.values.findIndex((value) => sameSkill(value, skill))
  const own = index >= 0 ? inputs.quickFire.values[index].value : null
  const elsewhere = inputs.quickFire.values.filter((_, other) => other !== index).map((value) => value.value)
  const creditRatingValue = sheet.occupation?.quickFireCreditRating?.value
  const values = [
    ...(isCreditRating && creditRatingValue !== undefined && !rules.quickFireSkillValues.includes(creditRatingValue) ? [creditRatingValue] : []),
    ...optionsFor(rowPool, elsewhere, own),
  ]
  const field = index >= 0 ? `quickFire.values[${index}].value` : `quickFireRows.${name}.value`
  return (
    <WizardSelect
      field={field}
      label={`${name}, Quick fire value`}
      hideLabel
      value={own === null ? null : String(own)}
      options={[{ value: NO_VALUE, label: NO_VALUE_LABEL }, ...[...new Set(values)].map((value) => ({ value: String(value), label: String(value) }))]}
      error={errors[field] ?? (isCreditRating ? errors.creditRating : undefined)}
      onChange={(value) => onAction({ type: 'quickFireValue', skill, value: value === NO_VALUE ? null : Number(value) })}
      onBlur={onBlur}
      className="w-28"
    />
  )
}

// UX-22: a slot with no skill chosen yet keeps its place, disabled, and says why.
function unchosenRow(row: Extract<OccupationRow, { kind: 'unchosen' }>, index: number, quickFire: boolean): SkillAllocationRow {
  const field = `unchosenRows[${index}]`
  return {
    key: `unchosen-${index}`,
    name: row.label,
    hint: UNCHOSEN_HINT,
    base: null,
    total: null,
    control: quickFire ? (
      <WizardSelect field={field} label={`${row.label}, Quick fire value`} hideLabel value={null} options={[]} disabled onChange={() => {}} className="w-28" />
    ) : (
      <WizardField field={field} label={`${row.label}, occupation points`} hideLabel type="number" value={null} disabled onChange={() => {}} className="w-28" />
    ),
  }
}

// UX-25: the skill that takes the freed value is a row of the table (section 18 assumption).
function extraRow(freed: number, extraSkill: SkillReference | null, { props, baseOf }: ValueContext): SkillAllocationRow {
  const { errors, skillCatalog, onAction, onBlur } = props
  return {
    key: 'extra-skill',
    name: `Extra skill (freed ${freed})`,
    hint: `Your Credit Rating doesn't use a Quick fire value, so the freed ${freed} goes to one more skill of your choice.`,
    base: extraSkill ? baseOf(extraSkill) : null,
    total: extraSkill ? freed : null,
    control: (
      <SkillPicker
        field="quickFire.extraSkill"
        label={`Extra skill for the freed ${freed}`}
        value={extraSkill}
        skillCatalog={skillCatalog}
        errors={errors}
        onChange={(skill) => onAction({ type: 'quickFireExtraSkill', skill })}
        onBlur={onBlur}
      />
    ),
  }
}

interface LeftOver {
  skill: SkillReference
  value: number | null
  field: string
  clear: () => void
}

function referenceTo({ skill, specialization }: SkillReference): SkillReference {
  return { skill, specialization }
}

function leftOversOf(props: SkillStepProps & { occupationRows: OccupationRow[] }): LeftOver[] {
  const { inputs, rules, onAction, occupationRows } = props
  const occupationSkills = occupationRows.flatMap((row) => (row.kind === 'skill' ? [row.skill] : []))
  const isLeftOver = (skill: SkillReference) =>
    skill.skill !== rules.creditRatingSkill && !occupationSkills.some((occupationSkill) => sameSkill(occupationSkill, skill))

  if (inputs.creationMethod === 'QuickFire') {
    return inputs.quickFire.values.flatMap((value, index) =>
      isLeftOver(value) ? [{ skill: value, value: value.value, field: `quickFire.values[${index}].skill`, clear: () => onAction({ type: 'quickFireValue', skill: referenceTo(value), value: null }) }] : [],
    )
  }

  return inputs.skills.flatMap((allocation, index) =>
    allocation.occupationPoints !== null && isLeftOver(allocation)
      ? [
          {
            skill: allocation,
            value: allocation.occupationPoints,
            field: `skills[${index}].occupationPoints`,
            clear: () => onAction({ type: 'skillPoints', skill: referenceTo(allocation), column: 'occupationPoints', value: null }),
          },
        ]
      : [],
  )
}

// UX-24: points or a value left on a former occupation skill stay visible with their error until removed.
function LeftOverSkills(props: SkillStepProps & { occupationRows: OccupationRow[] }) {
  const headingId = useId()
  const leftOvers = leftOversOf(props)
  if (leftOvers.length === 0) {
    return null
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 id={headingId} className="font-semibold">
        No longer occupation skills
      </h3>
      <ul className="flex flex-col gap-3">
        {leftOvers.map((leftOver) => {
          const name = nameOf(leftOver.skill)
          const error = props.errors[leftOver.field]
          return (
            <li key={leftOver.field} className="flex flex-wrap items-center gap-3">
              <span className="font-medium">{name}</span>
              <span>{leftOver.value}</span>
              <Button
                id={fieldId(leftOver.field)}
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Remove value from ${name}`}
                aria-describedby={error ? errorId(leftOver.field) : undefined}
                onClick={leftOver.clear}
                className="min-h-6"
              >
                Remove value
              </Button>
              {error && (
                <p id={errorId(leftOver.field)} className="flex basis-full items-center gap-1 text-sm text-destructive">
                  <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                  {error}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
