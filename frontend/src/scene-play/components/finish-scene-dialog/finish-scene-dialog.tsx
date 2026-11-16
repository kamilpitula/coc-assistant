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
import {
  closingRollsSentence,
  type ClosingRollCounts,
} from '@/roll-requests/services/waitingRollCount'

interface FinishSceneDialogProps {
  open: boolean
  sceneTitle: string
  pending: boolean
  failed: boolean
  /** The closing rolls finishing will close; unknown while the requests are loading (specs/scene-play/ux.md section 24.1). */
  closingRolls: ClosingRollCounts | undefined
  onConfirm: () => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/** The Keeper's confirmation before finishing the Active Scene (specs/scene-play/ux.md sections 3 and 24.1). */
export function FinishSceneDialog({ open, sceneTitle, pending, failed, closingRolls, onConfirm, onCancel, onCloseAutoFocus }: FinishSceneDialogProps) {
  const closingSentence = closingRollsSentence(closingRolls)

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">Finish {sceneTitle}?</AlertDialogTitle>
          <AlertDialogDescription>
            A Finished Scene can&apos;t be started again. Players will see that it has finished.
            {closingSentence !== null && <> {closingSentence}</>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            We couldn&apos;t finish the Scene. Try again.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button type="button" className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={onConfirm}>
            {pending ? 'Finishing...' : 'Finish Scene'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
