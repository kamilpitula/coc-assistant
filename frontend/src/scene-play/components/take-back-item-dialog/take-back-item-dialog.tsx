import { Button } from '@/shared/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

/** What the Keeper is taking back: the Item, its holder, and the id of the "Take back" button that opened the dialog. */
export interface TakeBackItemRequest {
  itemId: string
  itemName: string
  holderId: string
  holderName: string
  triggerId: string
}

/** What the dialog opener knows: the element ids to try in order when the trigger is gone (21.7). */
export interface TakeBackItemContext {
  fallbackIds: string[]
}

interface TakeBackItemDialogProps {
  open: boolean
  itemName: string
  holderName: string
  pending: boolean
  /** The refusal or failure to show as an alert inside the dialog. */
  refusal: string | null
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/**
 * The Keeper's confirmation for taking an Item back (specs/scene-play/ux.md section 22.4). The holder keeps the Clue.
 * While taking back, neither Escape nor the overlay closes it.
 */
export function TakeBackItemDialog({ open, itemName, holderName, pending, refusal, onConfirm, onCancel, onCloseAutoFocus }: TakeBackItemDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">
            Take {itemName} back from {holderName}?
          </AlertDialogTitle>
          <AlertDialogDescription>{holderName} keeps it among their Clues.</AlertDialogDescription>
        </AlertDialogHeader>
        {refusal && (
          <p role="alert" className="text-sm text-destructive">
            {refusal}
          </p>
        )}
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? 'Taking back...' : 'Take back'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
