import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'

interface StartOverDialogProps {
  onConfirm: () => void
  pending: boolean
}

/**
 * "Start over" for a Draft (specs/character-sheet/ux.md section 5.5): confirmation with "Keep draft" focused, focus
 * returns to the trigger when cancelled (A11Y-8).
 */
export function StartOverDialog({ onConfirm, pending }: StartOverDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="link" className="self-start px-0 text-destructive" disabled={pending}>
          {pending ? 'Deleting…' : 'Start over'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start over?</AlertDialogTitle>
          <AlertDialogDescription>This deletes your draft Investigator. You can&apos;t undo this.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep draft</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={onConfirm}>
            Delete draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
