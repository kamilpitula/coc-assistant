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

interface DeleteHandoutDialogProps {
  open: boolean
  handoutTitle: string
  pending: boolean
  /** The delete failed for a reason other than a refusal. */
  failed: boolean
  /** The server refused the delete (409): the Scene has been started, or the Item is in play. */
  refused: boolean
  /** What the refusal says, naming the owner. */
  refusedMessage: string
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/** The Keeper's confirmation before deleting a Handout (specs/scenario-preparation/ux.md sections 44 and 65). */
export function DeleteHandoutDialog({
  open,
  handoutTitle,
  pending,
  failed,
  refused,
  refusedMessage,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: DeleteHandoutDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Delete {handoutTitle}?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t delete the Handout. Try again.
          </p>
        )}
        {refused && (
          <p role="alert" className="text-sm text-destructive">
            {refusedMessage}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending || refused}
            onClick={onConfirm}
          >
            {pending ? 'Deleting...' : 'Delete Handout'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
