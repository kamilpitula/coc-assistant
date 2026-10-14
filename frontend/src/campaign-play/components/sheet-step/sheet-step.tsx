import { CharacterSheetView } from '@/campaign-play/components/character-sheet-view/character-sheet-view'
import { WorthCheckingAlert } from '@/campaign-play/components/worth-checking-alert/worth-checking-alert'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import type { WizardStepProps } from '@/campaign-play/types/WizardStepProps'

interface SheetStepProps {
  campaignId: string
  sheet: MyCharacterSheet
  editing: WizardStepProps
}

/**
 * Sheet and submit (specs/character-sheet/ux.md section 6.7): every warning of the sheet in "Worth checking" (selected
 * option A), then the shared sheet view with "Change" links and the Backstory, weapons, and Gear in edit mode.
 */
export function SheetStep({ campaignId, sheet, editing }: SheetStepProps) {
  const warnings = sheet.validationErrors.filter((error) => error.severity === 'Warning')
  return (
    <>
      <WorthCheckingAlert warnings={warnings} />
      <CharacterSheetView sheet={sheet.characterSheet} playerName={sheet.playerName} changeLinksFor={campaignId} editing={editing} />
    </>
  )
}
