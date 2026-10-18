import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { WizardSelect } from '@/campaign-play/components/wizard-select/wizard-select'
import { skillNames } from '@/campaign-play/services/skillBases'
import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import { addRowButtonId, rowPath, type SectionFieldsProps, type SkillRowState } from '@/scenario-preparation/services/humanNpcForm'
import { combatFamilyOf, skillRowName, specializationsOf } from '@/scenario-preparation/services/skillRowLabels'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

interface NpcSkillRowsProps extends SectionFieldsProps {
  /** The Era's skills, offered as suggestions; any name is accepted. */
  skillCatalog: SkillCatalog | undefined
  catalogFailed: boolean
  onRetryCatalog: () => void
}

/** The repeating skill rows of the Skills section (specs/scenario-preparation/ux.md section 25.4). */
export function NpcSkillRows({ state, dispatch, errorOf, skillCatalog, catalogFailed, onRetryCatalog }: NpcSkillRowsProps) {
  const skills = state.skills
  if (!skills) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Choose a skill from the list or type your own. Fighting and Firearms need a specialization from the list.
      </p>
      {catalogFailed && (
        <Alert variant="destructive" role="alert" className="flex flex-wrap items-center gap-3">
          <span>We couldn&apos;t load the skill list. You can still type skill names.</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetryCatalog}>
            Try again
          </Button>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">Hit Points and other worked-out values update when you save.</p>
      <RepeatingRows
        item="skill"
        items="skills"
        count={skills.length}
        addButtonId={addRowButtonId('skills')}
        onAdd={() => dispatch({ type: 'addSkill' })}
      >
        {skills.map((row, index) => (
          <SkillRow
            key={row.key}
            row={row}
            index={index}
            suggestions={skillCatalog ? skillNames(skillCatalog) : undefined}
            skillCatalog={skillCatalog}
            dispatch={dispatch}
            errorOf={errorOf}
          />
        ))}
      </RepeatingRows>
    </div>
  )
}

interface SkillRowProps {
  row: SkillRowState
  index: number
  suggestions: string[] | undefined
  skillCatalog: SkillCatalog | undefined
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

function SkillRow({ row, index, suggestions, skillCatalog, dispatch, errorOf }: SkillRowProps) {
  const removeLabel = `Remove skill ${skillRowName(row) ?? index + 1}`

  return (
    <div role="group" aria-label={`Skill ${index + 1}`} className="flex flex-wrap items-start gap-3">
      <WizardField
        field={rowPath('skills', index, 'name')}
        label="Skill"
        value={row.name}
        suggestions={suggestions ?? []}
        error={errorOf(rowPath('skills', index, 'name'))}
        onChange={(value) => dispatch({ type: 'setSkillText', index, field: 'name', value: value ?? '' })}
        className="min-w-48 flex-1 basis-full sm:basis-48"
      />
      <SpecializationField row={row} index={index} skillCatalog={skillCatalog} dispatch={dispatch} errorOf={errorOf} />
      <WizardField
        type="number"
        field={rowPath('skills', index, 'value')}
        label="Value"
        value={row.value}
        error={errorOf(rowPath('skills', index, 'value'))}
        onChange={(value) => dispatch({ type: 'setSkillValue', index, value })}
        className="w-24"
      />
      <div className="ml-auto self-end">
        <RemoveRowButton label={removeLabel} onClick={() => dispatch({ type: 'removeSkill', index })} />
      </div>
    </div>
  )
}

interface SpecializationFieldProps {
  row: SkillRowState
  index: number
  skillCatalog: SkillCatalog | undefined
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

/** Specialization is for Fighting and Firearms only: a list when the catalog is loaded, free text until then. */
function SpecializationField({ row, index, skillCatalog, dispatch, errorOf }: SpecializationFieldProps) {
  const family = combatFamilyOf(row.name)
  if (family === null) {
    return null
  }

  const path = rowPath('skills', index, 'specialization')
  const options = specializationsOf(family, skillCatalog)
  const onChange = (value: string) => dispatch({ type: 'setSkillText', index, field: 'specialization', value })

  return options ? (
    <WizardSelect
      field={path}
      label="Specialization"
      value={row.specialization === '' ? null : row.specialization}
      options={options.map((option) => ({ value: option, label: option }))}
      error={errorOf(path)}
      onChange={onChange}
      className="min-w-48 flex-1 basis-full sm:basis-48"
    />
  ) : (
    <WizardField
      field={path}
      label="Specialization"
      value={row.specialization}
      error={errorOf(path)}
      onChange={(value) => onChange(value ?? '')}
      className="min-w-48 flex-1 basis-full sm:basis-48"
    />
  )
}
