import { CircleAlert } from 'lucide-react'

import { errorId, fieldId } from '@/campaign-play/services/fieldIds'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/components/utils'

interface WizardTextareaProps {
  /** The ValidationError field path this textarea edits, for example "backstory.traits". */
  field: string
  label: string
  value: string | null
  error?: string
  maxLength?: number
  /** Keeps the label for assistive technology only, where a heading already names the textarea visibly. */
  hideLabel?: boolean
  onChange: (value: string | null) => void
  /** Called when the textarea loses focus, with the element receiving focus next (if any). */
  onBlur?: (field: string, nextFocus: EventTarget | null) => void
}

/**
 * A labelled wizard textarea for free text, with an inline error attached through aria-describedby and aria-invalid
 * (specs/character-sheet/ux.md sections 5.2 and 6.7). Line breaks are kept; an empty textarea reports null.
 */
export function WizardTextarea({ field, label, value, error, maxLength, hideLabel, onChange, onBlur }: WizardTextareaProps) {
  const textareaId = fieldId(field)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className={cn(hideLabel ? 'sr-only' : 'text-sm font-medium')}>
        {label}
      </label>
      <Textarea
        id={textareaId}
        value={value ?? ''}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        onBlur={(event) => onBlur?.(field, event.relatedTarget)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId(field) : undefined}
      />
      {error && (
        <p id={errorId(field)} className="flex items-center gap-1 text-sm text-destructive">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
