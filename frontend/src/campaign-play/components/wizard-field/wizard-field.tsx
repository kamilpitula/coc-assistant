import { CircleAlert } from 'lucide-react'
import type { ChangeEvent } from 'react'

import { errorId, fieldId } from '@/campaign-play/services/fieldIds'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/components/utils'

interface WizardFieldBaseProps {
  /** The ValidationError field path this input edits, for example "identity.age". */
  field: string
  label: string
  help?: string
  error?: string
  /** Called when the input loses focus, with the element receiving focus next (if any). */
  onBlur?: (field: string, nextFocus: EventTarget | null) => void
  className?: string
  /** Keeps the label for assistive technology only, where a table row already names the input visibly. */
  hideLabel?: boolean
  disabled?: boolean
}

interface TextFieldProps extends WizardFieldBaseProps {
  type?: 'text'
  value: string | null
  /** Offered through a datalist; any other text is accepted too. */
  suggestions?: string[]
  onChange: (value: string | null) => void
}

interface NumberFieldProps extends WizardFieldBaseProps {
  type: 'number'
  value: number | null
  onChange: (value: number | null) => void
}

export type WizardFieldProps = TextFieldProps | NumberFieldProps

function parseWholeNumber(text: string): number | null {
  const parsed = Number.parseInt(text, 10)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * A labelled wizard input with optional help text and an inline error attached through aria-describedby and
 * aria-invalid (specs/character-sheet/ux.md section 5.2).
 */
export function WizardField(props: WizardFieldProps) {
  const { field, label, help, error, onBlur, className, hideLabel, disabled } = props
  const inputId = fieldId(field)
  const helpId = `${inputId}-help`
  const describedBy = [help ? helpId : null, error ? errorId(field) : null].filter(Boolean).join(' ') || undefined
  const suggestions = props.type === 'number' ? undefined : props.suggestions
  const suggestionsId = `${inputId}-suggestions`

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value
    if (props.type === 'number') {
      props.onChange(text === '' ? null : parseWholeNumber(text))
    } else {
      props.onChange(text.trim() === '' ? null : text)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>
        {label}
      </label>
      <Input
        id={inputId}
        type={props.type === 'number' ? 'number' : 'text'}
        inputMode={props.type === 'number' ? 'numeric' : undefined}
        value={props.value ?? ''}
        disabled={disabled}
        onChange={handleChange}
        onBlur={(event) => onBlur?.(field, event.relatedTarget)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        list={suggestions ? suggestionsId : undefined}
        autoComplete={suggestions ? 'off' : undefined}
      />
      {suggestions && (
        <datalist id={suggestionsId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
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
