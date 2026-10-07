import { Info } from 'lucide-react'
import { useId, useState } from 'react'

import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import { SkillPicker } from '@/campaign-play/components/skill-picker/skill-picker'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { fieldId, groupDescribedBy } from '@/campaign-play/services/fieldIds'
import { formulaPoints } from '@/campaign-play/services/occupationSkills'
import {
  CHARACTERISTIC_CODES,
  type CharacterSheetRules,
  type CharacterSheetView,
  type CharacteristicInputs,
  type CustomOccupationInputs,
  type OccupationPointTerm,
} from '@/campaign-play/types/CharacterSheet'
import type { CatalogOccupation, OccupationCatalog, SkillCatalog } from '@/campaign-play/types/RuleData'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Input } from '@/shared/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

interface OccupationStepProps extends WizardStepProps {
  rules: CharacterSheetRules
  /** The saved sheet, for the characteristic values after age effects the points are worked out from. */
  sheet: CharacterSheetView
  occupationCatalog: OccupationCatalog
  skillCatalog: SkillCatalog
}

const CUSTOM = 'custom'
const EMPTY_CUSTOM: CustomOccupationInputs = { name: null, formulaId: null, skills: [], creditRatingMin: null, creditRatingMax: null }

function finalValues(sheet: CharacterSheetView): CharacteristicInputs {
  return Object.fromEntries(CHARACTERISTIC_CODES.map((code) => [code, sheet.characteristics[code].value]))
}

/** "EDU x 2 + APP or DEX or STR x 2" for a formula. */
function formulaLabel(terms: OccupationPointTerm[]): string {
  return terms.map((term) => `${term.characteristics.join(' or ')} x ${term.multiplier}`).join(' + ')
}

/**
 * Occupation (specs/character-sheet/ux.md section 6.4): a searchable RadioGroup of option cards with the Credit Rating
 * range and this Investigator's occupation points, a formula choice where the formula offers one, and a custom
 * occupation. Quick fire has no occupation points, so they are hidden (ux.md section 6.5a).
 */
export function OccupationStep(props: OccupationStepProps) {
  const { inputs, errors, sheet, occupationCatalog, onAction } = props
  const [search, setSearch] = useState('')
  const searchId = useId()
  const labelId = useId()
  const quickFire = inputs.creationMethod === 'QuickFire'
  const values = finalValues(sheet)
  const occupation = inputs.occupation
  const selected = occupation?.catalogId ?? (occupation?.custom ? CUSTOM : '')
  const shown = occupationCatalog.occupations.filter((candidate) => candidate.name.toLowerCase().includes(search.trim().toLowerCase()))

  const choose = (value: string) =>
    onAction(value === CUSTOM ? { type: 'occupation', catalogId: null, custom: occupation?.custom ?? EMPTY_CUSTOM } : { type: 'occupation', catalogId: value, custom: null })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={searchId} className="text-sm font-medium">
          Search occupations
        </label>
        <Input id={searchId} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <span id={labelId} className="font-medium">
        Occupation
      </span>
      <RadioGroup
        id={fieldId('occupation')}
        aria-labelledby={labelId}
        aria-describedby={groupDescribedBy('occupation', errors.occupation)}
        value={selected}
        onValueChange={choose}
        className="flex flex-col gap-3"
      >
        {shown.map((candidate) => (
          <OccupationCard key={candidate.id} occupation={candidate} points={quickFire ? null : formulaPoints(candidate.occupationPointFormula.terms, values, [])} />
        ))}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <RadioGroupItem id="occupation-custom" value={CUSTOM} className="size-5" />
          <label htmlFor="occupation-custom" className="font-medium">
            Custom occupation
          </label>
        </div>
      </RadioGroup>
      <FieldGroupError field="occupation" error={errors.occupation} />
      <FieldGroupError field="occupation.catalogId" error={errors['occupation.catalogId']} />

      {!quickFire && occupation?.catalogId && <FormulaChoice {...props} values={values} />}
      {occupation?.catalogId === null && occupation.custom && <CustomOccupationFields {...props} custom={occupation.custom} />}
    </div>
  )
}

function OccupationCard({ occupation, points }: { occupation: CatalogOccupation; points: number | null }) {
  const id = `occupation-${occupation.id}`
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <RadioGroupItem id={id} value={occupation.id} className="size-5" />
      <label htmlFor={id} className="flex flex-col">
        <span className="font-medium">{occupation.name}</span>{' '}
        <span className="text-sm text-muted-foreground">
          Credit Rating {occupation.creditRatingMin}-{occupation.creditRatingMax}
        </span>
        {points !== null && (
          <>
            {' '}
            <span className="text-sm">{points} occupation points</span>
          </>
        )}
      </label>
    </div>
  )
}

function FormulaChoice({ inputs, errors, occupationCatalog, onAction, values }: OccupationStepProps & { values: CharacteristicInputs }) {
  const occupation = occupationCatalog.occupations.find((candidate) => candidate.id === inputs.occupation?.catalogId)
  const terms = occupation?.occupationPointFormula.terms ?? []
  const index = terms.findIndex((term) => term.characteristics.length > 1)
  const labelId = useId()
  if (occupation === undefined || index < 0) {
    return null
  }

  const field = `occupation.formulaCharacteristics[${index}]`
  const chosen = inputs.occupation?.formulaCharacteristics[index] ?? ''
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="font-medium">
        Which characteristic do your occupation points use?
      </span>
      <RadioGroup
        id={fieldId(field)}
        aria-labelledby={labelId}
        aria-describedby={groupDescribedBy(field, errors[field])}
        value={chosen}
        onValueChange={(value) => onAction({ type: 'formulaCharacteristic', index, value })}
        className="flex flex-col gap-2"
      >
        {terms[index].characteristics.map((code) => {
          const picks = terms.map((_, other) => (other === index ? code : null))
          const option = terms.map((term, other) => ({ ...term, characteristics: other === index ? [code] : term.characteristics }))
          const points = formulaPoints(terms, values, picks)
          const id = `formula-${code}`
          return (
            <div key={code} className="flex items-center gap-2">
              <RadioGroupItem id={id} value={code} className="size-5" />
              <label htmlFor={id} className="text-sm">
                {formulaLabel(option)}
                {points === null ? '' : ` = ${points}`}
              </label>
            </div>
          )
        })}
      </RadioGroup>
      <FieldGroupError field={field} error={errors[field]} />
    </div>
  )
}

function CustomOccupationFields({ errors, rules, skillCatalog, onAction, onBlur, custom }: OccupationStepProps & { custom: CustomOccupationInputs }) {
  const update = (change: Partial<CustomOccupationInputs>) => onAction({ type: 'occupation', catalogId: null, custom: { ...custom, ...change } })
  const rangeField = 'occupation.custom.creditRating'

  return (
    <section aria-label="Custom occupation" className="flex flex-col gap-4">
      <WizardField field="occupation.custom.name" label="Name" value={custom.name} error={errors['occupation.custom.name']} onChange={(name) => update({ name })} onBlur={onBlur} />
      <WizardSelect
        field="occupation.custom.formulaId"
        label="Point formula"
        value={custom.formulaId}
        options={rules.occupationPointFormulas.map((formula) => ({ value: formula.id, label: formulaLabel(formula.terms) }))}
        error={errors['occupation.custom.formulaId']}
        onChange={(formulaId) => update({ formulaId })}
        onBlur={onBlur}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">Occupation skills</legend>
        {Array.from({ length: rules.customOccupationSkillCount }, (_, index) => (
          <SkillPicker
            key={index}
            field={`occupation.custom.skills[${index}]`}
            label={`Occupation skill ${index + 1}`}
            value={custom.skills[index] ?? null}
            skillCatalog={skillCatalog}
            errors={errors}
            onChange={(skill) => {
              const skills = Array.from({ length: Math.max(custom.skills.length, index + 1) }, (_, other) => custom.skills[other] ?? null)
              skills[index] = skill
              update({ skills })
            }}
            onBlur={onBlur}
          />
        ))}
      </fieldset>
      <fieldset id={fieldId(rangeField)} tabIndex={-1} aria-describedby={groupDescribedBy(rangeField, errors[rangeField])} className="flex flex-wrap gap-3">
        <legend className="mb-2 font-medium">Credit Rating</legend>
        <WizardField field={`${rangeField}Min`} label="Minimum" type="number" value={custom.creditRatingMin} onChange={(creditRatingMin) => update({ creditRatingMin })} onBlur={() => onBlur(rangeField, null)} />
        <WizardField field={`${rangeField}Max`} label="Maximum" type="number" value={custom.creditRatingMax} onChange={(creditRatingMax) => update({ creditRatingMax })} onBlur={() => onBlur(rangeField, null)} />
        <FieldGroupError field={rangeField} error={errors[rangeField]} />
      </fieldset>
      <Alert>
        <Info aria-hidden="true" />
        <AlertDescription>Your Keeper will review a custom occupation before approving your Investigator.</AlertDescription>
      </Alert>
    </section>
  )
}
