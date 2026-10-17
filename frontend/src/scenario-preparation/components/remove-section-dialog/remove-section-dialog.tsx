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

interface RemoveSectionDialogProps {
  open: boolean
  /** The section's label, for example "Skills". */
  section: string
  onKeep: () => void
  onRemove: () => void
}

/** Confirms removing a profile section that holds values (specs/scenario-preparation/ux.md section 25.2). */
export function RemoveSectionDialog({ open, section, onKeep, onRemove }: RemoveSectionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onKeep()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove the {section} section?</AlertDialogTitle>
          <AlertDialogDescription>Its values are deleted when you save.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep section</AlertDialogCancel>
          <Button type="button" className="bg-destructive text-white hover:bg-destructive/90" onClick={onRemove}>
            Remove section
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
