import type { WallEntry } from '@/campaign-play/types/WallEntry'
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

interface RemoveWallEntryDialogProps {
  /** The entry being removed; the dialog is open while it is set. */
  entry: WallEntry | null
  pending: boolean
  failed: boolean
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/** The Keeper's confirmation before removing a Wall Entry (specs/campaign-wall/ux.md section 4.3). */
export function RemoveWallEntryDialog({ entry, pending, failed, onConfirm, onCancel, onCloseAutoFocus }: RemoveWallEntryDialogProps) {
  const description =
    entry?.visibility === 'KeeperOnly' ? "This can't be undone." : "Players will no longer see it. This can't be undone."

  return (
    <AlertDialog open={entry !== null} onOpenChange={(open) => !open && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this Wall Entry?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t remove that entry. Try again.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Removing...' : 'Remove entry'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
