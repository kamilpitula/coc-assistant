import { useId } from 'react'

import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

/** The two visibilities a Keeper can choose; Players never see this choice. */
export type VisibilityChoiceValue = 'Public' | 'KeeperOnly'

interface VisibilityChoiceProps {
  legend: string
  publicLabel: string
  publicDescription: string
  keeperOnlyLabel: string
  keeperOnlyDescription: string
  value: VisibilityChoiceValue
  onChange: (value: VisibilityChoiceValue) => void
}

/**
 * A Keeper's visibility choice between Public and Keeper only, shared by the Wall composer and "Request a roll"
 * (specs/roll-requests/ux.md section 3.1): a RadioGroup named by its legend, with each option's description linked
 * to the option.
 */
export function VisibilityChoice({
  legend,
  publicLabel,
  publicDescription,
  keeperOnlyLabel,
  keeperOnlyDescription,
  value,
  onChange,
}: VisibilityChoiceProps) {
  const legendId = useId()
  const publicId = useId()
  const keeperOnlyId = useId()

  return (
    <div className="flex flex-col gap-2">
      <p id={legendId} className="text-sm font-medium">
        {legend}
      </p>
      <RadioGroup
        aria-labelledby={legendId}
        value={value}
        onValueChange={(next) => onChange(next as VisibilityChoiceValue)}
      >
        <VisibilityOption id={publicId} value="Public" label={publicLabel} description={publicDescription} />
        <VisibilityOption id={keeperOnlyId} value="KeeperOnly" label={keeperOnlyLabel} description={keeperOnlyDescription} />
      </RadioGroup>
    </div>
  )
}

interface VisibilityOptionProps {
  id: string
  value: VisibilityChoiceValue
  label: string
  description: string
}

function VisibilityOption({ id, value, label, description }: VisibilityOptionProps) {
  return (
    <div className="flex items-start gap-2">
      <RadioGroupItem id={id} value={value} aria-describedby={`${id}-description`} className="mt-1" />
      <div className="flex flex-col">
        <Label htmlFor={id}>{label}</Label>
        <span id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </span>
      </div>
    </div>
  )
}
