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

interface DeleteNonPlayerEntityDialogProps {
  open: boolean
  name: string
  pending: boolean
  /** The delete failed. */
  failed: boolean
  /** The profile is part of a Scene that has been played (409); arrives with Scene links (PBI-SP-004). */
  refused?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/** The Keeper's confirmation before deleting a Non-Player Entity (specs/scenario-preparation/ux.md section 25.3). */
export function DeleteNonPlayerEntityDialog({
  open,
  name,
  pending,
  failed,
  refused = false,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: DeleteNonPlayerEntityDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t delete {name}. Try again.
          </p>
        )}
        {refused && (
          <p role="alert" className="text-sm text-destructive">
            {name} is part of a Scene that has been played, so it can&apos;t be deleted.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" className="bg-destructive text-white hover:bg-destructive/90" disabled={pending || refused} onClick={onConfirm}>
            {pending ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
