import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { familyOf, skillNames } from '@/campaign-play/services/skillBases'
import { skillDisplayName } from '@/campaign-play/services/skillValidation'
import type { SkillReference } from '@/campaign-play/types/CharacterSheet'
import type { SkillCatalog } from '@/campaign-play/types/RuleData'

/** Never an occupation or personal interest pick (docs/game-rules sections 7.2 and 8; project_ruleset.md 4.5). */
const NOT_PICKABLE = ['Credit Rating', 'Cthulhu Mythos']

interface SkillPickerProps {
  /** The ValidationError field of the pick, for example "occupation.skillChoices[7][0]". */
  field: string
  label: string
  value: SkillReference | null
  /** The skills a slot offers; any skill when omitted. */
  options?: SkillReference[]
  /** The skill is given (a slot naming it with any specialization); only the specialization is picked. */
  specializationOnly?: boolean
  skillCatalog: SkillCatalog
  /** Inline error message by field path. */
  errors?: Record<string, string>
  onChange: (value: SkillReference | null) => void
  onBlur?: (field: string, nextFocus: EventTarget | null) => void
}

function keyOf(skill: SkillReference): string {
  return skillDisplayName(skill.skill, skill.specialization)
}

/**
 * Picks a skill and, for a specialized skill, its specialization: from the list for Fighting and Firearms, as text
 * with suggestions otherwise (specs/character-sheet/ux.md sections 6.4 and 6.5; project_ruleset.md section 4.2).
 */
export function SkillPicker({ field, label, value, options, specializationOnly = false, skillCatalog, errors = {}, onChange, onBlur }: SkillPickerProps) {
  const choices = options ?? skillNames(skillCatalog).filter((name) => !NOT_PICKABLE.includes(name)).map((name) => ({ skill: name, specialization: null }))
  const chosen = value ? choices.find((choice) => choice.skill === value.skill && (choice.specialization === null || choice.specialization === value.specialization)) : undefined
  const needsSpecialization = value !== null && chosen?.specialization == null && familyOf(value.skill, skillCatalog) !== 'none'
  const specializationField = `${field}.specialization`

  return (
    <div className="flex flex-wrap items-start gap-3">
      {!specializationOnly && (
        <WizardSelect
          field={field}
          label={label}
          value={chosen ? keyOf(chosen) : null}
          options={choices.map((choice) => ({ value: keyOf(choice), label: keyOf(choice) }))}
          error={errors[field]}
          onChange={(key) => onChange(choices.find((choice) => keyOf(choice) === key) ?? null)}
          onBlur={onBlur}
          className="min-w-56"
        />
      )}
      {needsSpecialization && (
        <SpecializationInput
          field={specializationField}
          label={specializationOnly ? label : `${value.skill} specialization`}
          value={value}
          skillCatalog={skillCatalog}
          error={errors[specializationField]}
          onChange={onChange}
          onBlur={onBlur}
        />
      )}
    </div>
  )
}

interface SpecializationInputProps {
  field: string
  label: string
  value: SkillReference
  skillCatalog: SkillCatalog
  error?: string
  onChange: (value: SkillReference | null) => void
  onBlur?: (field: string, nextFocus: EventTarget | null) => void
}

function SpecializationInput({ field, label, value, skillCatalog, error, onChange, onBlur }: SpecializationInputProps) {
  const closed = skillCatalog.closedFamilies.find((family) => family.skill === value.skill)
  if (closed) {
    return (
      <WizardSelect
        field={field}
        label={label}
        value={value.specialization}
        options={closed.specializations.map(({ specialization }) => ({ value: specialization, label: specialization }))}
        error={error}
        onChange={(specialization) => onChange({ skill: value.skill, specialization })}
        onBlur={onBlur}
        className="min-w-48"
      />
    )
  }

  return (
    <WizardField
      field={field}
      label={label}
      value={value.specialization}
      suggestions={skillCatalog.specializationSuggestions[value.skill] ?? []}
      error={error}
      onChange={(specialization) => onChange({ skill: value.skill, specialization })}
      onBlur={onBlur}
      className="min-w-48"
    />
  )
}
