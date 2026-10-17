import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { validateSceneForm, type SceneFieldErrors } from '@/scenario-preparation/services/sceneForm'
import type { SceneInput } from '@/scenario-preparation/types/Scene'
import { RichTextEditor } from '@/shared/components/rich-text-editor/rich-text-editor'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'
import type { RichTextDocument } from '@/shared/types/RichText'

const LOCATION_HINT = 'Where the Scene takes place, for example Arkham, Boston Road.'
const NOTES_HINT = 'Only you can read these. You can format text and add links.'

/** The ids of the fields in the order focus visits them: Title, Location, Keeper notes. */
interface FieldIds {
  title: string
  location: string
  notes: string
}

/** Focuses the first invalid field in the order Title, Location, Keeper notes. */
function focusFirstInvalid(errors: SceneFieldErrors, ids: FieldIds): void {
  const target = errors.title ? ids.title : errors.location ? ids.location : errors.keeperNotes ? ids.notes : null
  if (target) {
    document.getElementById(target)?.focus()
  }
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  errorId: string
  hint?: string
  hintId?: string
}

/** A labelled single-line field with an optional hint and an error shown next to it. */
function TextField({ id, label, value, onChange, error, errorId, hint, hintId }: TextFieldProps) {
  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  )
}

interface SceneFormProps {
  initialValues: SceneInput
  submitLabel: string
  /** The submit button's text while `pending`, for example "Creating...". */
  busyLabel: string
  pending: boolean
  /** The last save failed or was refused; announced as an alert and the typed values stay. */
  failureMessage?: string | null
  /** Field errors the server returned for the last save. */
  serverErrors?: SceneFieldErrors
  /** The secondary action, for example a link back to the Scenario or a Cancel button. */
  cancel: ReactNode
  /** Moves focus to the Title when the form appears (the Scene page's Edit). */
  autoFocusTitle?: boolean
  onSubmit: (values: SceneInput) => void
}

/**
 * The Title, Location, and Keeper notes form shared by creating and editing a Scene (specs/scenario-preparation/ux.md
 * section 13). Validates on submit, explains each invalid field next to it, and warns before leaving with unsaved edits.
 */
export function SceneForm({
  initialValues,
  submitLabel,
  busyLabel,
  pending,
  failureMessage,
  serverErrors,
  cancel,
  autoFocusTitle = false,
  onSubmit,
}: SceneFormProps) {
  const ids = {
    title: useId(),
    titleError: useId(),
    location: useId(),
    locationHint: useId(),
    locationError: useId(),
    notes: useId(),
    notesLabel: useId(),
    notesHint: useId(),
    notesError: useId(),
  }
  const [title, setTitle] = useState(initialValues.title)
  const [location, setLocation] = useState(initialValues.location)
  const [clientErrors, setClientErrors] = useState<SceneFieldErrors>({})
  const [notesChanged, setNotesChanged] = useState(false)
  const notes = useRef<RichTextDocument | null>(initialValues.keeperNotes)
  const errors: SceneFieldErrors = { ...serverErrors, ...clientErrors }
  const isDirty = title !== initialValues.title || location !== initialValues.location || notesChanged
  useUnsavedChangesPrompt(isDirty)

  useEffect(() => {
    if (autoFocusTitle) {
      document.getElementById(ids.title)?.focus()
    }
    // Focus once, when the form appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusTitle])

  // A refusal from the server is explained like a local one, with focus on the first invalid field.
  useEffect(() => {
    if (serverErrors) {
      focusFirstInvalid(serverErrors, ids)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateSceneForm({ title, location, keeperNotes: notes.current })
    if (result.success) {
      setClientErrors({})
      onSubmit(result.data)
      return
    }

    setClientErrors(result.errors)
    focusFirstInvalid(result.errors, ids)
  }

  return (
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <TextField
        id={ids.title}
        label="Title"
        value={title}
        onChange={setTitle}
        error={errors.title}
        errorId={ids.titleError}
      />
      <TextField
        id={ids.location}
        label="Location (optional)"
        value={location}
        onChange={setLocation}
        error={errors.location}
        errorId={ids.locationError}
        hint={LOCATION_HINT}
        hintId={ids.locationHint}
      />

      <div className="flex flex-col gap-2">
        <Label id={ids.notesLabel} htmlFor={ids.notes} onClick={() => document.getElementById(ids.notes)?.focus()}>
          Keeper notes (optional)
        </Label>
        <RichTextEditor
          id={ids.notes}
          labelledBy={ids.notesLabel}
          describedBy={errors.keeperNotes ? `${ids.notesHint} ${ids.notesError}` : ids.notesHint}
          invalid={Boolean(errors.keeperNotes)}
          initialValue={initialValues.keeperNotes}
          onChange={(value) => {
            notes.current = value
            setNotesChanged(true)
          }}
        />
        <p id={ids.notesHint} className="text-sm text-muted-foreground">
          {NOTES_HINT}
        </p>
        <FieldError id={ids.notesError} message={errors.keeperNotes} />
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
