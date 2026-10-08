import { useEffect, useId, useRef, useState } from 'react'

import { FieldGroupError } from '@/campaign-play/components/field-group-error/field-group-error'
import type { SkillStepProps } from '@/campaign-play/components/occupation-skills-step/occupation-skills-step'
import { PointsLeftCounter } from '@/campaign-play/components/points-left-counter/points-left-counter'
import { SkillAllocationTable, type SkillAllocationRow } from '@/campaign-play/components/skill-allocation-table/skill-allocation-table'
import { SkillPicker } from '@/campaign-play/components/skill-picker/skill-picker'
import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { CircleAlert } from 'lucide-react'

import { errorId, fieldId } from '@/campaign-play/services/fieldIds'
import { occupationSkillsOf } from '@/campaign-play/services/occupationSkills'
import { pointsField, skillTableEntries, skillTotal, type SkillTableEntry } from '@/campaign-play/services/skillTableEntries'
import { skillDisplayName } from '@/campaign-play/services/skillValidation'
import { sameSkill } from '@/campaign-play/state/characterSheetForm'
import type { SkillReference } from '@/campaign-play/types/CharacterSheet'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

type Filter = 'all' | 'withPoints'

/**
 * Personal interests (specs/character-sheet/ux.md sections 6.6 and 6.5a): personal interest points on every skill but
 * Cthulhu Mythos (docs/game-rules section 8) and Credit Rating (project_ruleset.md section 4.6), with the points left;
 * Quick fire chooses its personal interest skills with Checkboxes instead (section 18).
 */
export function PersonalInterestsStep(props: SkillStepProps) {
  const { inputs, errors, rules, sheet, occupationCatalog, skillCatalog, onBlur } = props
  const [filter, setFilter] = useState<Filter>('all')
  const [added, setAdded] = useState<SkillReference[]>([])
  const [announcement, setAnnouncement] = useState('')
  const quickFire = inputs.creationMethod === 'QuickFire'
  const budget = sheet.derived.personalInterestPoints?.budget ?? null
  const spent = inputs.skills.reduce((sum, allocation) => sum + (allocation.personalInterestPoints ?? 0), 0)

  const entries = skillTableEntries(sheet, inputs, skillCatalog, occupationCatalog, added)
    .filter((entry) => entry.skill.skill !== rules.creditRatingSkill)
    .filter((entry) => filter === 'all' || hasPoints(entry, props))

  const announceBudget = (field: string, nextFocus: EventTarget | null) => {
    if (budget !== null) {
      setAnnouncement(`${budget - spent} personal interest points left`)
    }
    onBlur(field, nextFocus)
  }

  const rows = entries.flatMap((entry) => (quickFire ? quickFireRow(entry, props) : [pointsRow(entry, props, announceBudget)]))
  const chosen = inputs.quickFire.personalInterests.length

  return (
    <div className="flex flex-col gap-6">
      <ShowFilter value={filter} onChange={setFilter} />
      <SkillAllocationTable caption="Personal interests" controlHeading={quickFire ? 'Personal interest' : 'Points'} rows={rows} />
      {quickFire ? (
        <p className="text-sm font-medium">
          Personal interests chosen: {chosen} of {rules.quickFirePersonalInterestCount}
        </p>
      ) : (
        <PointsLeftCounter label="Personal interest points" budget={budget} spent={spent} />
      )}
      <FieldGroupError field="personalInterestPoints" error={errors.personalInterestPoints} />
      <FieldGroupError field="quickFire.personalInterests" error={errors['quickFire.personalInterests']} />
      <StrandedInterests {...props} />
      <AddSpecialization {...props} onAdd={(skill) => setAdded((previous) => [...previous, skill])} />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}

function hasPoints(entry: SkillTableEntry, { inputs }: SkillStepProps): boolean {
  const allocation = inputs.skills.find((candidate) => sameSkill(candidate, entry.skill))
  const interest = inputs.quickFire.personalInterests.some((candidate) => sameSkill(candidate, entry.skill))
  const assigned = inputs.quickFire.values.some((candidate) => sameSkill(candidate, entry.skill))
  return interest || assigned || (allocation?.occupationPoints ?? 0) !== 0 || (allocation?.personalInterestPoints ?? 0) !== 0
}

function ShowFilter({ value, onChange }: { value: Filter; onChange: (filter: Filter) => void }) {
  const labelId = useId()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span id={labelId} className="text-sm font-medium">
        Show:
      </span>
      <RadioGroup aria-labelledby={labelId} value={value} onValueChange={(next) => onChange(next as Filter)} className="flex gap-4">
        <div className="flex items-center gap-2">
          <RadioGroupItem id="show-all-skills" value="all" className="size-5" />
          <label htmlFor="show-all-skills" className="text-sm">
            All skills
          </label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem id="show-skills-with-points" value="withPoints" className="size-5" />
          <label htmlFor="show-skills-with-points" className="text-sm">
            Skills with points
          </label>
        </div>
      </RadioGroup>
    </div>
  )
}

function pointsRow(entry: SkillTableEntry, props: SkillStepProps, onBlur: (field: string, nextFocus: EventTarget | null) => void): SkillAllocationRow {
  const { inputs, errors, rules, onAction } = props
  const name = skillDisplayName(entry.skill.skill, entry.skill.specialization)
  const field = pointsField(inputs, entry.skill, 'personalInterestPoints')
  const mythos = entry.skill.skill === rules.cthulhuMythosSkill
  const allocation = inputs.skills.find((candidate) => sameSkill(candidate, entry.skill))
  return {
    key: name,
    name,
    base: entry.base,
    total: skillTotal(entry.base, inputs, entry.skill, rules.quickFirePersonalInterestBonus),
    control: (
      <div className="flex flex-col gap-1">
        <WizardField
          field={field}
          label={`${name}, personal interest points`}
          hideLabel
          type="number"
          value={allocation?.personalInterestPoints ?? null}
          error={errors[field]}
          onChange={(value) => onAction({ type: 'skillPoints', skill: entry.skill, column: 'personalInterestPoints', value })}
          onBlur={onBlur}
          className="w-28"
          disabled={mythos}
        />
        {mythos && <span className="text-sm text-muted-foreground">Not available at creation</span>}
      </div>
    ),
  }
}

// Section 18: personal interests are skills outside the occupation, never Credit Rating or Cthulhu Mythos.
function quickFireRow(entry: SkillTableEntry, props: SkillStepProps): SkillAllocationRow[] {
  const { inputs, errors, rules, onAction } = props
  const assigned = inputs.quickFire.values.some((value) => sameSkill(value, entry.skill))
  const extra = inputs.quickFire.extraSkill ? sameSkill(inputs.quickFire.extraSkill, entry.skill) : false
  if (entry.isOccupationSkill || assigned || extra || entry.skill.skill === rules.cthulhuMythosSkill) {
    return []
  }

  const name = skillDisplayName(entry.skill.skill, entry.skill.specialization)
  const index = inputs.quickFire.personalInterests.findIndex((candidate) => sameSkill(candidate, entry.skill))
  const id = fieldId(index >= 0 ? `quickFire.personalInterests[${index}]` : `quickFireInterests.${name}`)
  const error = index >= 0 ? errors[`quickFire.personalInterests[${index}]`] : undefined
  return [
    {
      key: name,
      name,
      base: entry.base,
      total: skillTotal(entry.base, inputs, entry.skill, rules.quickFirePersonalInterestBonus),
      control: (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id={id}
              checked={index >= 0}
              aria-label={`${name}, +${rules.quickFirePersonalInterestBonus}`}
              aria-invalid={error ? true : undefined}
              onCheckedChange={(checked) => onAction({ type: 'quickFireInterest', skill: entry.skill, chosen: checked === true })}
              className="size-5"
            />
            <span aria-hidden="true" className="text-sm">
              +{rules.quickFirePersonalInterestBonus}
            </span>
          </div>
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      ),
    },
  ]
}

function AddSpecialization({ skillCatalog, onAdd }: SkillStepProps & { onAdd: (skill: SkillReference) => void }) {
  const [adding, setAdding] = useState<SkillReference | null | undefined>(undefined)
  const container = useRef<HTMLDivElement>(null)
  const families = [...skillCatalog.closedFamilies.map((family) => family.skill), ...skillCatalog.openFamilies].map((family) => ({ skill: family, specialization: null }))

  useEffect(() => {
    if (adding === null) {
      container.current?.querySelector<HTMLElement>('button[role="combobox"]')?.focus()
    }
  }, [adding])

  if (adding === undefined) {
    return (
      <Button type="button" variant="outline" className="self-start" onClick={() => setAdding(null)}>
        Add another specialization
      </Button>
    )
  }

  return (
    <div ref={container} className="flex flex-wrap items-end gap-3">
      <SkillPicker
        field="newSpecialization"
        label="Skill to specialize"
        value={adding}
        options={families}
        skillCatalog={skillCatalog}
        onChange={(skill) => setAdding(skill)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={!adding?.specialization}
        onClick={() => {
          if (adding?.specialization) {
            onAdd(adding)
            setAdding(undefined)
          }
        }}
      >
        Add row
      </Button>
    </div>
  )
}

interface Stranded {
  key: string
  name: string
  field: string
  label: string
  remove: () => void
}

// A Quick fire personal interest that is now an occupation skill, the extra skill, valued, Cthulhu Mythos, or a repeat.
function strandedQuickFireInterests({ inputs, rules, occupationCatalog, onAction }: SkillStepProps): Stranded[] {
  const occupationSkills = occupationSkillsOf(inputs.occupation, occupationCatalog)
  const extra = inputs.quickFire.extraSkill ?? null
  const interests = inputs.quickFire.personalInterests
  return interests.flatMap((interest, index) => {
    const notAllowed =
      interest.skill === rules.creditRatingSkill ||
      interest.skill === rules.cthulhuMythosSkill ||
      occupationSkills.some((skill) => sameSkill(skill, interest)) ||
      (extra !== null && sameSkill(extra, interest)) ||
      inputs.quickFire.values.some((value) => sameSkill(value, interest)) ||
      interests.findIndex((other) => sameSkill(other, interest)) < index
    const name = skillDisplayName(interest.skill, interest.specialization)
    const skill = { skill: interest.skill, specialization: interest.specialization }
    return notAllowed
      ? [
          {
            key: `interest-${index}`,
            name,
            field: `quickFire.personalInterests[${index}]`,
            label: `Remove ${name} from your personal interests`,
            // Unchecking removes every copy, which also clears a repeat (section 18 assumption: each skill once).
            remove: () => onAction({ type: 'quickFireInterest', skill, chosen: false }),
          },
        ]
      : []
  })
}

// Personal interest points on Credit Rating (project_ruleset.md 4.6) or Cthulhu Mythos (section 8).
function strandedInterestPoints({ inputs, rules, onAction }: SkillStepProps): Stranded[] {
  return inputs.skills.flatMap((allocation, index) => {
    const notAllowed = allocation.skill === rules.creditRatingSkill || allocation.skill === rules.cthulhuMythosSkill
    const skill = { skill: allocation.skill, specialization: allocation.specialization }
    const name = skillDisplayName(allocation.skill, allocation.specialization)
    return notAllowed && allocation.personalInterestPoints !== null
      ? [
          {
            key: `points-${index}`,
            name,
            field: `skills[${index}].personalInterestPoints`,
            label: `Remove personal interest points from ${name}`,
            remove: () => onAction({ type: 'skillPoints', skill, column: 'personalInterestPoints', value: null }),
          },
        ]
      : []
  })
}

/**
 * Personal interest choices the rules no longer allow stay visible with their error and a way to remove them, so a
 * stranded choice never blocks submission without a target (specs/character-sheet/ux.md section 6.6; UX-26).
 */
function StrandedInterests(props: SkillStepProps) {
  const headingId = useId()
  const stranded = props.inputs.creationMethod === 'QuickFire' ? strandedQuickFireInterests(props) : strandedInterestPoints(props)
  if (stranded.length === 0) {
    return null
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 id={headingId} className="font-semibold">
        No longer personal interests
      </h3>
      <ul className="flex flex-col gap-3">
        {stranded.map((entry) => {
          const error = props.errors[entry.field]
          return (
            <li key={entry.key} className="flex flex-wrap items-center gap-3">
              <span className="font-medium">{entry.name}</span>
              <Button
                id={fieldId(entry.field)}
                type="button"
                variant="outline"
                size="sm"
                className="min-h-6"
                aria-label={entry.label}
                aria-describedby={error ? errorId(entry.field) : undefined}
                onClick={entry.remove}
              >
                Remove
              </Button>
              {error && (
                <p id={errorId(entry.field)} className="flex basis-full items-center gap-1 text-sm text-destructive">
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
