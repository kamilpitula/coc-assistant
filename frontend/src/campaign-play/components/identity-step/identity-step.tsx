import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import { rollGroupOf } from '@/campaign-play/services/rollGroups'
import type { CharacterSheetView, IdentityInputs } from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'

interface IdentityStepProps extends WizardStepProps {
  /** The Player's Account display name; read-only, never entered (A11Y-10). */
  playerName: string | null
  /** The saved sheet: the age-bracket lock and the records that fixed the bracket. */
  sheet: CharacterSheetView
}

const textFields: { field: Exclude<keyof IdentityInputs, 'age'>; label: string }[] = [
  { field: 'gender', label: 'Gender' },
  { field: 'residence', label: 'Residence' },
  { field: 'birthplace', label: 'Birthplace' },
]

/**
 * The age hint naming what fixed the bracket (ux.md section 6.8), or null when the age-bracket lock does not apply.
 */
function ageLockHint(sheet: CharacterSheetView): string | null {
  if (!sheet.locks.ageBracket || sheet.ageEffects.bracket === null) {
    return null
  }

  const rolled = sheet.luckRolls.some((roll) => roll !== null) || sheet.rollRecords.some((record) => rollGroupOf(record.purpose) === 'Luck')
    ? 'Luck'
    : null
  const edu = sheet.ageEffects.eduImprovementChecks.length > 0 || sheet.rollRecords.some((record) => rollGroupOf(record.purpose) === 'EduImprovementChecks')
    ? 'EDU checks'
    : null
  const what = [rolled, edu].filter((part): part is string => part !== null).join(' and ')
  const { minimumAge, maximumAge } = sheet.ageEffects.bracket
  return `Your age must stay between ${minimumAge} and ${maximumAge} because you rolled ${what}.`
}

/** Concept and Identity (specs/character-sheet/ux.md section 6.1). */
export function IdentityStep({ inputs, errors, playerName, sheet, onAction, onBlur }: IdentityStepProps) {
  const { identity } = inputs
  const lockHint = ageLockHint(sheet)
  return (
    <div className="flex flex-col gap-4">
      <WizardField
        field="identity.name"
        label="Investigator name"
        value={identity.name}
        error={errors['identity.name']}
        onChange={(value) => onAction({ type: 'identity', field: 'name', value })}
        onBlur={onBlur}
      />
      <WizardField
        field="identity.age"
        label="Age"
        type="number"
        value={identity.age}
        help={lockHint ?? "Age affects your characteristics. You'll see how in a later step."}
        error={errors['identity.age']}
        onChange={(value) => onAction({ type: 'identity', field: 'age', value })}
        onBlur={onBlur}
        className="max-w-40"
      />
      {textFields.map(({ field, label }) => (
        <WizardField
          key={field}
          field={`identity.${field}`}
          label={label}
          value={identity[field]}
          error={errors[`identity.${field}`]}
          onChange={(value) => onAction({ type: 'identity', field, value })}
          onBlur={onBlur}
        />
      ))}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Player name</span>
        <span className="text-sm">{playerName ?? 'Unknown Player'}</span>
      </div>
    </div>
  )
}
