import { CircleAlert } from 'lucide-react'

import { errorId, fieldId } from '@/campaign-play/services/fieldIds'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { cn } from '@/shared/components/utils'

export interface WizardSelectOption {
  value: string
  label: string
}

interface WizardSelectProps {
  /** The ValidationError field path this Select edits, for example "characteristics.STR". */
  field: string
  label: string
  value: string | null
  options: WizardSelectOption[]
  placeholder?: string
  help?: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
  /** Called when the Select loses focus, with the element receiving focus next (if any). */
  onBlur?: (field: string, nextFocus: EventTarget | null) => void
  className?: string
  /** Keeps the label for assistive technology only, where a table row already names the Select visibly. */
  hideLabel?: boolean
}

/**
 * A labelled wizard Select (shadcn/ui, Radix) with optional help text and an inline error attached through
 * aria-describedby and aria-invalid (specs/character-sheet/ux.md sections 5.2 and 8).
 */
export function WizardSelect({ field, label, value, options, placeholder = 'Choose', help, error, disabled, onChange, onBlur, className, hideLabel }: WizardSelectProps) {
  const controlId = fieldId(field)
  const helpId = `${controlId}-help`
  const describedBy = [help ? helpId : null, error ? errorId(field) : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>
        {label}
      </label>
      <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onBlur={(event) => onBlur?.(field, event.relatedTarget)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help && (
        <p id={helpId} className="text-sm text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId(field)} className="flex items-center gap-1 text-sm text-destructive">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
