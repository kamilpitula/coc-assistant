import { CircleAlert } from 'lucide-react'

import { errorId } from '@/campaign-play/services/fieldIds'

interface FieldGroupErrorProps {
  /** The ValidationError field path of the group, for example "characteristics". */
  field: string
  error?: string
}

/** The inline error of a group of inputs; the group references it through aria-describedby. */
export function FieldGroupError({ field, error }: FieldGroupErrorProps) {
  if (!error) {
    return null
  }

  return (
    <p id={errorId(field)} className="flex items-center gap-1 text-sm text-destructive">
      <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      {error}
    </p>
  )
}
