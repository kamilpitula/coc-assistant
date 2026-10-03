import type { CharacterSheetFormAction } from '@/campaign-play/state/characterSheetForm'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

/** What every creation wizard step receives from the wizard. */
export interface WizardStepProps {
  inputs: CharacterSheetInputs
  /** Inline error message by ValidationError field path, for the errors the step should show now. */
  errors: Record<string, string>
  onAction: (action: CharacterSheetFormAction) => void
  onBlur: (field: string) => void
}
