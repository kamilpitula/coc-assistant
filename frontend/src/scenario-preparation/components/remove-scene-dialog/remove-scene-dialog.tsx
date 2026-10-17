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

interface RemoveSceneDialogProps {
  open: boolean
  sceneTitle: string
  pending: boolean
  /** The removal failed for a reason other than the Scene having been started. */
  failed: boolean
  /** The Scene is no longer Prepared (409). */
  refused: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/** The Keeper's confirmation before removing a Prepared Scene (specs/scenario-preparation/ux.md section 14). */
export function RemoveSceneDialog({
  open,
  sceneTitle,
  pending,
  failed,
  refused,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: RemoveSceneDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Remove {sceneTitle}?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t remove the Scene. Try again.
          </p>
        )}
        {refused && (
          <p role="alert" className="text-sm text-destructive">
            This Scene has been started, so it can&apos;t be removed.
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
            {pending ? 'Removing...' : 'Remove Scene'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
