import { CircleAlert } from 'lucide-react'
import { useId, type Ref } from 'react'

import { CREATION_METHODS, type CreationMethod } from '@/campaign-play/types/Campaign'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Label } from '@/shared/components/ui/label'

import { creationMethodLabels, inCanonicalOrder } from './creationMethodLabels'

interface CreationMethodsFieldsetProps {
  value: readonly CreationMethod[]
  onChange: (next: CreationMethod[]) => void
  error?: string
  disabled?: boolean
  firstCheckboxRef?: Ref<HTMLButtonElement>
}

function toggle(value: readonly CreationMethod[], method: CreationMethod, checked: boolean): CreationMethod[] {
  return inCanonicalOrder(checked ? [...value, method] : value.filter((existing) => existing !== method))
}

/** The "Allowed creation methods" checkbox group shared by the create-campaign form and the edit dialog. */
export function CreationMethodsFieldset({
  value,
  onChange,
  error,
  disabled,
  firstCheckboxRef,
}: CreationMethodsFieldsetProps) {
  const idPrefix = useId()
  const errorId = `${idPrefix}-error`

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Allowed creation methods</legend>
      {CREATION_METHODS.map((method, index) => {
        const checkboxId = `${idPrefix}-${method}`
        const { name, description } = creationMethodLabels[method]
        return (
          <div key={method} className="flex min-h-6 items-center gap-2">
            <Checkbox
              id={checkboxId}
              ref={index === 0 ? firstCheckboxRef : undefined}
              checked={value.includes(method)}
              onCheckedChange={(checked) => onChange(toggle(value, method, checked === true))}
              aria-invalid={error !== undefined}
              aria-describedby={error ? errorId : undefined}
              disabled={disabled}
            />
            <Label htmlFor={checkboxId} className="font-normal leading-6">
              {name} - {description}
            </Label>
          </div>
        )
      })}
      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-1 text-sm text-destructive">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  )
}
