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

interface UnlinkItemDialogProps {
  open: boolean
  /** The Item's name. */
  name: string
  pending: boolean
  /** The unlink failed for a reason other than the Scene having been finished. */
  failed: boolean
  /** The Scene is Finished (409). */
  refused: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/** The Keeper's confirmation before unlinking an Item from a Scene (specs/scenario-preparation/ux.md section 64.3). */
export function UnlinkItemDialog({ open, name, pending, failed, refused, onConfirm, onCancel, onCloseAutoFocus }: UnlinkItemDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Unlink {name}?</AlertDialogTitle>
          <AlertDialogDescription className="break-words">{name} stays in the Campaign with its Handouts.</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm break-words text-destructive">
            We couldn&apos;t unlink {name}. Try again.
          </p>
        )}
        {refused && (
          <p role="alert" className="text-sm text-destructive">
            This Scene has been finished, so it can&apos;t be changed.
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
            {pending ? 'Unlinking...' : 'Unlink'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
