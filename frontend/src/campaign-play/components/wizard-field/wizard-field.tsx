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
}

interface TextFieldProps extends WizardFieldBaseProps {
  type?: 'text'
  value: string | null
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
  const { field, label, help, error, onBlur, className } = props
  const inputId = fieldId(field)
  const helpId = `${inputId}-help`
  const describedBy = [help ? helpId : null, error ? errorId(field) : null].filter(Boolean).join(' ') || undefined

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
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={inputId}
        type={props.type === 'number' ? 'number' : 'text'}
        inputMode={props.type === 'number' ? 'numeric' : undefined}
        value={props.value ?? ''}
        onChange={handleChange}
        onBlur={(event) => onBlur?.(field, event.relatedTarget)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
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
