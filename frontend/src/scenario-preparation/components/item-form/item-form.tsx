import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { firstInvalidItemField, validateItemForm, type ItemFormErrors } from '@/scenario-preparation/services/itemForm'
import type { ItemField, ItemFormValues, ItemInput } from '@/scenario-preparation/types/Item'
import { RichTextEditor } from '@/shared/components/rich-text-editor/rich-text-editor'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'
import type { RichTextDocument } from '@/shared/types/RichText'

const NAME_HINT = 'Players see the name when you reveal or give this Item.'
const DESCRIPTION_HINT =
  'What the Investigators may learn about it. Players see it only when you reveal or give the Item. You can format text and add links.'
const NOTES_HINT = 'Only you can read these. You can format text and add links.'

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

interface ItemFormProps {
  initialValues: ItemFormValues
  submitLabel: string
  /** The submit button's text while `pending`, for example "Creating...". */
  busyLabel: string
  pending: boolean
  /** The last save failed; announced as an alert and the typed values stay. */
  failureMessage?: string | null
  /** Field errors the server returned for the last save. */
  serverErrors?: ItemFormErrors
  /** The secondary action, for example a link back to the list or a Cancel button. */
  cancel: ReactNode
  /** Moves focus to the Name when the form appears (the Item page's Edit). */
  autoFocusName?: boolean
  onSubmit: (values: ItemInput) => void
}

/**
 * The Name, Player-facing description, and Keeper notes form shared by creating and editing an Item (specs/scenario-preparation/ux.md
 * section 62). Validates on submit, explains each invalid field next to it in field order, and warns before leaving with unsaved edits.
 */
export function ItemForm({
  initialValues,
  submitLabel,
  busyLabel,
  pending,
  failureMessage,
  serverErrors,
  cancel,
  autoFocusName = false,
  onSubmit,
}: ItemFormProps) {
  const ids: Record<ItemField, string> = { name: useId(), playerFacingDescription: useId(), keeperNotes: useId() }
  const hintIds = { name: useId(), description: useId(), notes: useId() }
  const errorIds = { name: useId(), description: useId(), notes: useId() }
  const labelIds = { description: useId(), notes: useId() }
  const [name, setName] = useState(initialValues.name)
  const [clientErrors, setClientErrors] = useState<ItemFormErrors>({})
  const [descriptionChanged, setDescriptionChanged] = useState(false)
  const [notesChanged, setNotesChanged] = useState(false)
  const description = useRef<RichTextDocument | null>(initialValues.playerFacingDescription)
  const notes = useRef<RichTextDocument | null>(initialValues.keeperNotes)
  const errors: ItemFormErrors = { ...serverErrors, ...clientErrors }
  useUnsavedChangesPrompt(name !== initialValues.name || descriptionChanged || notesChanged)

  const focusFirstInvalid = (invalid: ItemFormErrors) => {
    const field = firstInvalidItemField(invalid)
    if (field) {
      document.getElementById(ids[field])?.focus()
    }
  }

  useEffect(() => {
    if (autoFocusName) {
      document.getElementById(ids.name)?.focus()
    }
    // Focus once, when the form appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusName])

  // A refusal from the server is explained like a local one, with focus on the first invalid field.
  useEffect(() => {
    if (serverErrors) {
      focusFirstInvalid(serverErrors)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateItemForm({ name, playerFacingDescription: description.current, keeperNotes: notes.current })
    if (result.success) {
      setClientErrors({})
      onSubmit(result.data)
      return
    }

    setClientErrors(result.errors)
    focusFirstInvalid(result.errors)
  }

  return (
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.name}>Name</Label>
        <Input
          id={ids.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${hintIds.name} ${errorIds.name}` : hintIds.name}
        />
        <p id={hintIds.name} className="text-sm text-muted-foreground">
          {NAME_HINT}
        </p>
        <FieldError id={errorIds.name} message={errors.name} />
      </div>

      <div className="flex flex-col gap-2">
        <Label id={labelIds.description} htmlFor={ids.playerFacingDescription} onClick={() => document.getElementById(ids.playerFacingDescription)?.focus()}>
          Player-facing description
        </Label>
        <RichTextEditor
          id={ids.playerFacingDescription}
          labelledBy={labelIds.description}
          describedBy={errors.playerFacingDescription ? `${hintIds.description} ${errorIds.description}` : hintIds.description}
          invalid={Boolean(errors.playerFacingDescription)}
          initialValue={initialValues.playerFacingDescription}
          onChange={(value) => {
            description.current = value
            setDescriptionChanged(true)
          }}
        />
        <p id={hintIds.description} className="text-sm text-muted-foreground">
          {DESCRIPTION_HINT}
        </p>
        <FieldError id={errorIds.description} message={errors.playerFacingDescription} />
      </div>

      <div className="flex flex-col gap-2">
        <Label id={labelIds.notes} htmlFor={ids.keeperNotes} onClick={() => document.getElementById(ids.keeperNotes)?.focus()}>
          Keeper notes (optional)
        </Label>
        <RichTextEditor
          id={ids.keeperNotes}
          labelledBy={labelIds.notes}
          describedBy={errors.keeperNotes ? `${hintIds.notes} ${errorIds.notes}` : hintIds.notes}
          invalid={Boolean(errors.keeperNotes)}
          initialValue={initialValues.keeperNotes}
          onChange={(value) => {
            notes.current = value
            setNotesChanged(true)
          }}
        />
        <p id={hintIds.notes} className="text-sm text-muted-foreground">
          {NOTES_HINT}
        </p>
        <FieldError id={errorIds.notes} message={errors.keeperNotes} />
      </div>

      {failureMessage && (
        <Alert variant="destructive" role="alert">
          {failureMessage}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? busyLabel : submitLabel}
        </Button>
        {cancel}
      </div>
    </form>
  )
}
