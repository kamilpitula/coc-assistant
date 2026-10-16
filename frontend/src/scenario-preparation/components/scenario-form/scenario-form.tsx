import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { validateScenarioForm, type ScenarioFieldErrors } from '@/scenario-preparation/services/scenarioForm'
import type { ScenarioInput } from '@/scenario-preparation/types/Scenario'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'

const NOTES_HINT = 'Only you can read these. Up to 10,000 characters.'

/** Focuses the Title when it is invalid, otherwise the Keeper notes when they are. */
function focusFirstInvalid(errors: ScenarioFieldErrors, title: HTMLElement | null, notes: HTMLElement | null) {
  const target = errors.title ? title : errors.keeperNotes ? notes : null
  target?.focus()
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

interface ScenarioFormProps {
  initialValues: ScenarioInput
  submitLabel: string
  /** The submit button's text while `pending`, for example "Creating...". */
  busyLabel: string
  pending: boolean
  /** The last save failed; announced as an alert and the typed values stay. */
  failureMessage?: string | null
  /** Field errors the server returned for the last save. */
  serverErrors?: ScenarioFieldErrors
  /** The secondary action, for example a link back to the Overview or a Cancel button. */
  cancel: ReactNode
  /** Moves focus to the Title when the form appears (the Scenario page's Edit). */
  autoFocusTitle?: boolean
  onSubmit: (values: ScenarioInput) => void
}

/**
 * The Title and Keeper notes form shared by creating and editing a Scenario (specs/scenario-preparation/ux.md section
 * 4). Validates on submit, explains each invalid field next to it, and warns before leaving with unsaved edits.
 */
export function ScenarioForm({
  initialValues,
  submitLabel,
  busyLabel,
  pending,
  failureMessage,
  serverErrors,
  cancel,
  autoFocusTitle = false,
  onSubmit,
}: ScenarioFormProps) {
  const ids = { title: useId(), titleError: useId(), notes: useId(), hint: useId(), notesError: useId() }
  const [title, setTitle] = useState(initialValues.title)
  const [keeperNotes, setKeeperNotes] = useState(initialValues.keeperNotes)
  const [clientErrors, setClientErrors] = useState<ScenarioFieldErrors>({})
  const titleRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const errors: ScenarioFieldErrors = { ...serverErrors, ...clientErrors }
  const isDirty = title !== initialValues.title || keeperNotes !== initialValues.keeperNotes
  useUnsavedChangesPrompt(isDirty)

  useEffect(() => {
    if (autoFocusTitle) {
      titleRef.current?.focus()
    }
  }, [autoFocusTitle])

  // A refusal from the server is explained like a local one, with focus on the first invalid field.
  useEffect(() => {
    if (serverErrors) {
      focusFirstInvalid(serverErrors, titleRef.current, notesRef.current)
    }
  }, [serverErrors])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateScenarioForm({ title, keeperNotes })
    if (result.success) {
      setClientErrors({})
      onSubmit(result.data)
      return
    }

    setClientErrors(result.errors)
    focusFirstInvalid(result.errors, titleRef.current, notesRef.current)
  }

  return (
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.title}>Title</Label>
        <Input
          id={ids.title}
          ref={titleRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? ids.titleError : undefined}
        />
        <FieldError id={ids.titleError} message={errors.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.notes}>Keeper notes (optional)</Label>
        <Textarea
          id={ids.notes}
          ref={notesRef}
          rows={8}
          className="resize-y"
          value={keeperNotes}
          onChange={(event) => setKeeperNotes(event.target.value)}
          aria-invalid={errors.keeperNotes ? true : undefined}
          aria-describedby={errors.keeperNotes ? `${ids.hint} ${ids.notesError}` : ids.hint}
        />
        <p id={ids.hint} className="text-sm text-muted-foreground">
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
