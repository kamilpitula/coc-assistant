import { WizardField } from '@/campaign-play/components/wizard-field/wizard-field'
import type { IdentityInputs } from '@/campaign-play/types/CharacterSheet'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'

interface IdentityStepProps extends WizardStepProps {
  /** The Player's Account display name; read-only, never entered (A11Y-10). */
  playerName: string | null
}

const textFields: { field: Exclude<keyof IdentityInputs, 'age'>; label: string }[] = [
  { field: 'gender', label: 'Gender' },
  { field: 'residence', label: 'Residence' },
  { field: 'birthplace', label: 'Birthplace' },
]

/** Concept and Identity (specs/character-sheet/ux.md section 6.1). */
export function IdentityStep({ inputs, errors, playerName, onAction, onBlur }: IdentityStepProps) {
  const { identity } = inputs
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
        help="Age affects your characteristics. You'll see how in a later step."
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
