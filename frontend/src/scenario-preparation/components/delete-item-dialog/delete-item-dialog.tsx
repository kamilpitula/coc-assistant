import { itemDeleteRefusal } from '@/scenario-preparation/services/itemInPlay'
import type { ItemInPlayReason } from '@/scenario-preparation/types/Item'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'

interface DeleteItemDialogProps {
  open: boolean
  name: string
  pending: boolean
  /** The delete failed for a reason other than a refusal. */
  failed: boolean
  /** Why the server refused the delete (409), or null when it did not. */
  refusedBecause: ItemInPlayReason | null
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/** The Keeper's confirmation before deleting an Item (specs/scenario-preparation/ux.md section 63.3). */
export function DeleteItemDialog({ open, name, pending, failed, refusedBecause, onConfirm, onCancel, onCloseAutoFocus }: DeleteItemDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. Its Handouts are deleted, and it is removed from any Prepared Scene it is part of.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm break-words text-destructive">
            We couldn&apos;t delete {name}. Try again.
          </p>
        )}
        {refusedBecause && (
          <p role="alert" className="text-sm break-words text-destructive">
            {itemDeleteRefusal(name, refusedBecause)}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending || refusedBecause !== null}
            onClick={onConfirm}
          >
            {pending ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
