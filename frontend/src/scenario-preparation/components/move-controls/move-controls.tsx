import { ArrowDown, ArrowUp } from 'lucide-react'

import { moveButtonId, type MoveDirection } from '@/scenario-preparation/services/preparedOrder'
import { Button } from '@/shared/components/ui/button'

interface MoveControlsProps {
  itemId: string
  title: string
  isFirst: boolean
  isLast: boolean
  saving: boolean
  /** `scenario` or `scene`: part of every button id. */
  buttonIdPrefix: string
  onMove: (itemId: string, direction: MoveDirection) => void
}

/** "Move up" and "Move down" for one row of a prepared order; the first row has no "Move up", the last no "Move down". */
export function MoveControls({ itemId, title, isFirst, isLast, saving, buttonIdPrefix, onMove }: MoveControlsProps) {
  return (
    <div className="flex shrink-0 items-center">
      {isFirst ? (
        <span aria-hidden="true" className="size-10" />
      ) : (
        <MoveButton {...{ itemId, title, direction: 'up', saving, buttonIdPrefix, onMove }} />
      )}
      {isLast ? (
        <span aria-hidden="true" className="size-10" />
      ) : (
        <MoveButton {...{ itemId, title, direction: 'down', saving, buttonIdPrefix, onMove }} />
      )}
    </div>
  )
}

interface MoveButtonProps {
  itemId: string
  title: string
  direction: MoveDirection
  saving: boolean
  buttonIdPrefix: string
  onMove: (itemId: string, direction: MoveDirection) => void
}

/** aria-disabled, never disabled, while saving, so focus is kept (SP-A11Y-9). */
function MoveButton({ itemId, title, direction, saving, buttonIdPrefix, onMove }: MoveButtonProps) {
  const Icon = direction === 'up' ? ArrowUp : ArrowDown

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      id={moveButtonId(buttonIdPrefix, itemId, direction)}
      className="size-10 aria-disabled:opacity-50"
      aria-disabled={saving || undefined}
      onClick={() => onMove(itemId, direction)}
    >
      <Icon aria-hidden="true" />
      <span className="sr-only">
        Move {title} {direction}
      </span>
    </Button>
  )
}
