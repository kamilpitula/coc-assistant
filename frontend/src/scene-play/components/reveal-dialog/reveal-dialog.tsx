import { useEffect, useRef, useState } from 'react'

import { InvestigatorsPresentFieldset } from '@/scene-play/components/investigators-present-fieldset/investigators-present-fieldset'
import { toggled } from '@/scene-play/services/presentSelection'
import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'

const NOTHING_CHECKED = 'Choose at least one Investigator.'

export interface RevealDialogRefusal {
  message: string
}

interface RevealDialogProps {
  open: boolean
  /** The title of what is revealed, for the dialog name and the failure sentence. */
  title: string
  /** "Read-aloud . Player-facing" style line under the title. */
  summary: string
  investigators: InvestigatorPresent[]
  /** The ids of the Investigators who already received this subject in this Scene. */
  alreadyRevealedIds: ReadonlySet<string>
  pending: boolean
  /** The refusal or failure to show as an alert inside the dialog. */
  refusal: RevealDialogRefusal | null
  onConfirm: (investigatorIds: string[]) => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/**
 * The Keeper's choice of recipients for a Reveal (specs/scene-play/ux.md section 13). Every present Investigator who has not yet
 * received the subject is pre-checked, those who have are marked "(already revealed)", and the choice is always sent explicitly. Focus
 * starts on the first checkbox; nothing checked is refused locally. While revealing, neither Escape nor the overlay closes it.
 */
export function RevealDialog({ open, title, summary, investigators, alreadyRevealedIds, pending, refusal, onConfirm, onCancel, onCloseAutoFocus }: RevealDialogProps) {
  const [selection, setSelection] = useState<string[]>([])
  const [emptyError, setEmptyError] = useState(false)
  const firstCheckboxRef = useRef<HTMLButtonElement>(null)

  // A fresh dialog starts from who has not received the subject yet; the Keeper's choices then persist while a refusal updates the list.
  useEffect(() => {
    if (open) {
      // The selection is reset when the dialog opens, from props that change only then.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection(investigators.filter((investigator) => !alreadyRevealedIds.has(investigator.id)).map((investigator) => investigator.id))
      setEmptyError(false)
    }
    // Only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // A refetched list drops choices of Investigators who left (choices are kept by id).
  useEffect(() => {
    const ids = new Set(investigators.map((investigator) => investigator.id))
    // The selection follows the list that the refetch updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection((current) => (current.every((id) => ids.has(id)) ? current : current.filter((id) => ids.has(id))))
  }, [investigators])

  const notes = Object.fromEntries(investigators.filter((investigator) => alreadyRevealedIds.has(investigator.id)).map((investigator) => [investigator.id, '(already revealed)']))

  const confirm = () => {
    if (selection.length === 0) {
      setEmptyError(true)
      firstCheckboxRef.current?.focus()
      return
    }
    onConfirm(investigators.filter((investigator) => selection.includes(investigator.id)).map((investigator) => investigator.id))
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          firstCheckboxRef.current?.focus()
        }}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onInteractOutside={(event) => pending && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="break-words">Reveal {title}</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>
        <InvestigatorsPresentFieldset
          investigators={investigators.map((investigator) => ({ id: investigator.id, name: investigator.name, playerName: '' }))}
          selected={selection}
          onToggle={(id, checked) => {
            setSelection((current) => toggled(current, id, checked))
            setEmptyError(false)
          }}
          error={emptyError ? NOTHING_CHECKED : undefined}
          firstCheckboxRef={firstCheckboxRef}
          disabled={pending}
          legend="Reveal to"
          hint="Players see it as it is now. A Reveal can't be undone."
          notes={notes}
        />
        {refusal && (
          <p role="alert" className="text-sm text-destructive">
            {refusal.message}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" disabled={pending} onClick={confirm}>
            {pending ? 'Revealing...' : 'Reveal'}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
