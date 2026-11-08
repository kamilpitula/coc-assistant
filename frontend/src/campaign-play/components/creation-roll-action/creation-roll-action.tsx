import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'

interface CreationRollActionProps {
  /** The trigger DOM id, so error summary links can focus the roll action. */
  id: string
  /** The id of the inline error describing the trigger, when one is shown. */
  describedBy?: string
  /** The group label, for example "Roll characteristics" (ux.md 6.8; A11Y-12). */
  label: string
  /** The dialog body: what the app rolls and that each roll is final. */
  body: string
  /** True while the roll is pending: both buttons are disabled and "Roll now" reads "Rolling...". */
  pending: boolean
  /** Sends the roll; the dialog stays open while pending and closes once the roll settles. */
  onRoll: () => void
}

/**
 * A creation roll action: a primary Button naming its group, opening a confirmation AlertDialog (specs/character-sheet
 * ux.md section 6.8). "Not yet" and Escape close without rolling and return focus to the trigger (A11Y-8).
 */
export function CreationRollAction({ id, describedBy, label, body, pending, onRoll }: CreationRollActionProps) {
  const [open, setOpen] = useState(false)
  const wasPending = useRef(false)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (wasPending.current && !pending) {
      setOpen(false)
    }
    wasPending.current = pending
  }, [pending])

  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={trigger}
        id={id}
        type="button"
        disabled={pending}
        aria-describedby={describedBy}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{label}?</AlertDialogTitle>
            <AlertDialogDescription>{body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Not yet</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                // Keep the dialog open while the roll is pending; it closes once the roll settles.
                event.preventDefault()
                onRoll()
              }}
            >
              {pending ? 'Rolling...' : 'Roll now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
