import { CircleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState, type Ref } from 'react'

import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'

const NOTHING_CHOSEN = 'Choose an Investigator.'

/** What the Keeper is giving: the Item, its current holder, and the id of the "Give..." button that opened the dialog. */
export interface GiveItemRequest {
  itemId: string
  itemName: string
  /** The current holder, for "(holds it)" and the held hint; null while no one holds the Item. */
  holder: { id: string; name: string } | null
  triggerId: string
}

/** What the dialog opener knows: the element ids to try in order when the trigger is gone (21.7). */
export interface GiveItemContext {
  fallbackIds: string[]
}

interface GiveItemDialogProps {
  open: boolean
  itemName: string
  /** The current holder, by present id and name; their radio is disabled with "(holds it)". */
  holder: { id: string; name: string } | null
  /** Who is present, in roster order. */
  investigators: InvestigatorPresent[]
  pending: boolean
  /** The refusal or failure to show as an alert inside the dialog. */
  refusal: string | null
  onConfirm: (investigatorId: string) => void
  onCancel: () => void
  /** Called when the dialog has closed, so the owner can choose where focus goes. */
  onCloseAutoFocus: (event: Event) => void
}

/**
 * The Keeper's choice of who receives an Item (specs/scene-play/ux.md section 22.3). Nothing is chosen at first; the
 * current holder is disabled with "(holds it)". With nothing chosen, choosing is refused locally and focus moves to the
 * first enabled radio. While giving, neither Escape nor the overlay closes it.
 */
export function GiveItemDialog({ open, itemName, holder, investigators, pending, refusal, onConfirm, onCancel, onCloseAutoFocus }: GiveItemDialogProps) {
  const [choice, setChoice] = useState<string | undefined>(undefined)
  const [emptyError, setEmptyError] = useState(false)
  const firstRadioRef = useRef<HTMLButtonElement>(null)
  const idPrefix = useId()
  const hintId = `${idPrefix}-hint`
  const errorId = `${idPrefix}-error`

  // A fresh dialog starts with nothing chosen; the Keeper's choice then persists while a refusal updates the list.
  useEffect(() => {
    if (open) {
      // The choice is reset when the dialog opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChoice(undefined)
      setEmptyError(false)
    }
    // Only when the dialog opens.
  }, [open])

  // A refetched list drops a choice of an Investigator who left (choices are kept by id).
  useEffect(() => {
    const ids = new Set(investigators.map((investigator) => investigator.id))
    // The choice follows the list that the refetch updates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice((current) => (current !== undefined && !ids.has(current) ? undefined : current))
  }, [investigators])

  const firstEnabled = investigators.find((investigator) => investigator.id !== holder?.id)

  const confirm = () => {
    if (choice === undefined) {
      setEmptyError(true)
      firstRadioRef.current?.focus()
      return
    }
    onConfirm(choice)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          firstRadioRef.current?.focus()
        }}
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onInteractOutside={(event) => pending && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="break-words">Give {itemName}</DialogTitle>
          <DialogDescription>
            <Badge variant="secondary">Item</Badge>
          </DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Give to</legend>
          <p id={hintId} className="text-sm text-muted-foreground">
            {itemName} becomes theirs, and they receive it as a Clue. Taking it back later doesn&apos;t remove the Clue.
            {holder === null ? null : ` ${holder.name} holds it now and keeps the Clue.`}
          </p>
          {emptyError && (
            <p id={errorId} className="flex items-center gap-1 text-sm text-destructive">
              <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
              {NOTHING_CHOSEN}
            </p>
          )}
          <RadioGroup
            value={choice ?? ''}
            onValueChange={(value) => {
              setChoice(value)
              setEmptyError(false)
            }}
            aria-describedby={emptyError ? `${hintId} ${errorId}` : hintId}
            aria-invalid={emptyError}
            disabled={pending}
          >
            {investigators.map((investigator) => {
              const radioId = `${idPrefix}-${investigator.id}`
              const held = investigator.id === holder?.id
              return (
                <div key={investigator.id} className="flex min-h-6 items-start gap-2">
                  <RadioGroupItem
                    id={radioId}
                    value={investigator.id}
                    ref={investigator.id === firstEnabled?.id ? firstRadioRef as Ref<HTMLButtonElement> : undefined}
                    className="mt-1"
                    disabled={pending || held}
                  />
                  <Label htmlFor={radioId} className="flex min-h-6 flex-wrap items-baseline gap-x-2 font-normal leading-6 break-words">
                    <span>{investigator.name}</span>
                    {held && (
                      <>
                        {' '}
                        <span className="text-muted-foreground">(holds it)</span>
                      </>
                    )}
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </fieldset>
        {refusal && (
          <p role="alert" className="text-sm text-destructive">
            {refusal}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" disabled={pending} onClick={confirm}>
            {pending ? 'Giving...' : 'Give'}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
