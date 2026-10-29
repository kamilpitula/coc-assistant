import { CircleAlert } from 'lucide-react'
import { useId, type Ref } from 'react'

import type { ApprovedInvestigator } from '@/scene-play/types/ActiveScene'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'

interface InvestigatorsPresentFieldsetProps {
  investigators: ApprovedInvestigator[]
  selected: string[]
  onToggle: (investigatorId: string, checked: boolean) => void
  error?: string
  disabled?: boolean
  firstCheckboxRef?: Ref<HTMLButtonElement>
}

/**
 * The Keeper's choice of Investigators present, shared by the start page and the Active Scene page (specs/scene-play/ux.md
 * sections 2 and 3; SPL-A11Y-2): a fieldset with a legend, a hint, one labelled checkbox per Approved Investigator, and an error.
 */
export function InvestigatorsPresentFieldset({ investigators, selected, onToggle, error, disabled, firstCheckboxRef }: InvestigatorsPresentFieldsetProps) {
  const idPrefix = useId()
  const hintId = `${idPrefix}-hint`
  const errorId = `${idPrefix}-error`

  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${hintId} ${errorId}` : hintId} aria-invalid={error !== undefined}>
      <legend className="mb-1 text-sm font-medium">Investigators present</legend>
      <p id={hintId} className="text-sm text-muted-foreground">
        Choose the Investigators taking part in this Scene.
      </p>
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-sm text-destructive">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      )}
      {investigators.map((investigator, index) => {
        const checkboxId = `${idPrefix}-${investigator.id}`
        return (
          <div key={investigator.id} className="flex min-h-6 items-start gap-2">
            <Checkbox
              id={checkboxId}
              ref={index === 0 ? firstCheckboxRef : undefined}
              className="mt-1"
              checked={selected.includes(investigator.id)}
              onCheckedChange={(checked) => onToggle(investigator.id, checked === true)}
              aria-invalid={error !== undefined}
              disabled={disabled}
            />
            <Label htmlFor={checkboxId} className="flex min-h-6 flex-wrap items-baseline gap-x-2 font-normal leading-6 break-words">
              <span>{investigator.name ?? 'Unnamed Investigator'}</span>
              <span className="text-muted-foreground">{investigator.playerName}</span>
            </Label>
          </div>
        )
      })}
    </fieldset>
  )
}
