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

interface UnlinkNonPlayerEntityDialogProps {
  open: boolean
  /** The link's Player-facing name. */
  playerFacingName: string
  /** The linked profile's name. */
  profileName: string
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

/** The Keeper's confirmation before unlinking a Non-Player Entity from a Scene (specs/scenario-preparation/ux.md section 34). */
export function UnlinkNonPlayerEntityDialog({
  open,
  playerFacingName,
  profileName,
  pending,
  failed,
  refused,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: UnlinkNonPlayerEntityDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Unlink {playerFacingName}?</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            Its Player-facing name and description are deleted. {profileName} stays in the Campaign.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t unlink {playerFacingName}. Try again.
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
