import type { ReactNode } from 'react'

import { MAX_ROWS } from '@/scenario-preparation/services/humanNpcForm'
import { Button } from '@/shared/components/ui/button'

interface RepeatingRowsProps {
  /** The singular item, for example "skill"; names the Add button ("Add skill"). */
  item: string
  /** The plural item, for example "skills"; used in the limit message. */
  items: string
  count: number
  addButtonId: string
  onAdd: () => void
  children: ReactNode
}

/**
 * The rows of a repeating list with its "Add {item}" button, which is replaced by "You've reached the limit of 100
 * {items}." at the limit (specs/scenario-preparation/ux.md section 25.2; SP-UX-34).
 */
export function RepeatingRows({ item, items, count, addButtonId, onAdd, children }: RepeatingRowsProps) {
  return (
    <div className="flex flex-col gap-3">
      {children}
      {count >= MAX_ROWS ? (
        <p className="text-sm text-muted-foreground">
          You&apos;ve reached the limit of {MAX_ROWS} {items}.
        </p>
      ) : (
        <Button id={addButtonId} type="button" variant="outline" className="self-start" onClick={onAdd}>
          Add {item}
        </Button>
      )}
    </div>
  )
}
