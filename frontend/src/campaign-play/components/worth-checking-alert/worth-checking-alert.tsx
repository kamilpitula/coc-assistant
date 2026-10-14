import { TriangleAlert } from 'lucide-react'

import type { ValidationError } from '@/campaign-play/types/CharacterSheet'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'

interface WorthCheckingAlertProps {
  warnings: ValidationError[]
  /** Further lines listed after the warnings, such as the Keeper's custom content (ux.md section 7.1). */
  notes?: string[]
}

/** Non-blocking warnings, shown to the Player and the Keeper (specs/character-sheet/ux.md sections 5.2 and 7.1). */
export function WorthCheckingAlert({ warnings, notes = [] }: WorthCheckingAlertProps) {
  if (warnings.length === 0 && notes.length === 0) {
    return null
  }

  return (
    <Alert variant="warning">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>Worth checking</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5">
          {warnings.map((warning) => (
            <li key={`${warning.field}-${warning.code}`}>{warning.message}</li>
          ))}
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
