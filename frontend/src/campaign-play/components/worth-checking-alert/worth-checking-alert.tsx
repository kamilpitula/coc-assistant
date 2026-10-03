import { TriangleAlert } from 'lucide-react'

import type { ValidationError } from '@/campaign-play/types/CharacterSheet'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'

interface WorthCheckingAlertProps {
  warnings: ValidationError[]
}

/** Non-blocking warnings, shown to the Player and the Keeper (specs/character-sheet/ux.md sections 5.2 and 7.1). */
export function WorthCheckingAlert({ warnings }: WorthCheckingAlertProps) {
  if (warnings.length === 0) {
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
        </ul>
      </AlertDescription>
    </Alert>
  )
}
