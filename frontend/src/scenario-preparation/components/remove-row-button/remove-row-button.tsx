import { Trash2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'

interface RemoveRowButtonProps {
  /** For example "Remove skill Spot Hidden" or "Remove skill 3". */
  label: string
  onClick: () => void
}

/** A ghost row-removal button, 40 by 40 CSS pixels (specs/scenario-preparation/ux.md section 25.2; SP-A11Y-21). */
export function RemoveRowButton({ label, onClick }: RemoveRowButtonProps) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label={label} title={label} onClick={onClick}>
      <Trash2 aria-hidden="true" />
    </Button>
  )
}
