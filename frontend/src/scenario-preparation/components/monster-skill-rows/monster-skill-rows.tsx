import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { skillNames } from '@/campaign-play/services/skillBases'
import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import { RemoveRowButton } from '@/scenario-preparation/components/remove-row-button/remove-row-button'
import { RepeatingRows } from '@/scenario-preparation/components/repeating-rows/repeating-rows'
import type { SectionFieldsProps, SkillRowState } from '@/scenario-preparation/services/mythosCreatureForm'
import { addRowButtonId, rowPath } from '@/scenario-preparation/services/profileForm'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

interface MonsterSkillRowsProps extends SectionFieldsProps {
  /** The Era's skills, offered as suggestions; any name is accepted. */
  skillCatalog: SkillCatalog | undefined
  catalogFailed: boolean
  onRetryCatalog: () => void
}

/** The repeating skill rows of a Monster Profile's Skills section (specs/scenario-preparation/ux.md section 25.5). */
export function MonsterSkillRows({ state, dispatch, errorOf, skillCatalog, catalogFailed, onRetryCatalog }: MonsterSkillRowsProps) {
  const skills = state.skills
  if (!skills) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Choose a skill from the list or type your own, with a value from 0 to 2,000.</p>
      {catalogFailed && (
        <Alert variant="destructive" role="alert" className="flex flex-wrap items-center gap-3">
          <span>We couldn&apos;t load the skill list. You can still type skill names.</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetryCatalog}>
            Try again
          </Button>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">Hit Points and other worked-out values update when you save.</p>
      <RepeatingRows item="skill" items="skills" count={skills.length} addButtonId={addRowButtonId('skills')} onAdd={() => dispatch({ type: 'addSkill' })}>
        {skills.map((row, index) => (
          <SkillRow
            key={row.key}
            row={row}
            index={index}
            suggestions={skillCatalog ? skillNames(skillCatalog) : undefined}
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
  dispatch: SectionFieldsProps['dispatch']
  errorOf: SectionFieldsProps['errorOf']
}

function SkillRow({ row, index, suggestions, dispatch, errorOf }: SkillRowProps) {
  const name = row.name.trim()
  const removeLabel = `Remove skill ${name === '' ? index + 1 : name}`

  return (
    <div role="group" aria-label={`Skill ${index + 1}`} className="flex flex-wrap items-start gap-3">
      <WizardField
        field={rowPath('skills', index, 'name')}
        label="Skill"
        value={row.name}
        suggestions={suggestions ?? []}
        error={errorOf(rowPath('skills', index, 'name'))}
        onChange={(value) => dispatch({ type: 'setSkillName', index, value: value ?? '' })}
        className="min-w-48 flex-1 basis-full sm:basis-48"
      />
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
