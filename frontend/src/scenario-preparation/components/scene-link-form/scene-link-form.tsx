import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'

import {
  NonPlayerEntityPicker,
  type NonPlayerEntityPickerHandle,
} from '@/scenario-preparation/components/non-player-entity-picker/non-player-entity-picker'
import type { NonPlayerEntityLinkFieldErrors } from '@/scenario-preparation/services/nonPlayerEntityLinkApi'
import {
  firstInvalidField,
  validateNonPlayerEntityLinkForm,
  type NonPlayerEntityLinkFormErrors,
  type NonPlayerEntityLinkFormValues,
} from '@/scenario-preparation/services/nonPlayerEntityLinkForm'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityLinkField, NonPlayerEntityReference } from '@/scenario-preparation/types/Scene'
import { RichTextEditor } from '@/shared/components/rich-text-editor/rich-text-editor'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'
import type { RichTextDocument } from '@/shared/types/RichText'

const NAME_HINT = 'What the Investigators know it as, for example A shape in the cellar.'
const DESCRIPTION_HINT = 'What the Investigators may learn. Players see it only when you reveal it. You can format text and add links.'

/** The picker's data when the form lets the Keeper choose the entity (linking); editing shows no picker. */
export interface SceneLinkFormPicker {
  campaignId: string
  entities: NonPlayerEntitySummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  /** The entities the Scene already links. */
  linked: NonPlayerEntityReference[]
}

interface SceneLinkFormProps {
  /** Present when linking: the form then asks for an entity. */
  picker?: SceneLinkFormPicker
  initialValues: NonPlayerEntityLinkFormValues
  submitLabel: string
  /** The submit button's text while `pending`, for example "Linking...". */
  busyLabel: string
  pending: boolean
  /** The last save failed or was refused; announced as an alert and the typed values stay. */
  failureMessage?: string | null
  /** Messages the server returned for the last save, by field. */
  serverErrors?: NonPlayerEntityLinkFieldErrors
  /** The secondary action: a link back to the Scene. */
  cancel: ReactNode
  /** Moves focus to the Player-facing name when the form appears (editing). */
  autoFocusName?: boolean
  onSubmit: (values: NonPlayerEntityLinkFormValues) => void
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

/**
 * The Non-Player Entity, Player-facing name, and Player-facing description form shared by the link and edit pages
 * (specs/scenario-preparation/ux.md section 33). Validates on submit, explains each invalid field next to it, focuses the
 * first invalid field, and warns before leaving with unsaved edits.
 */
export function SceneLinkForm({
  picker,
  initialValues,
  submitLabel,
  busyLabel,
  pending,
  failureMessage,
  serverErrors,
  cancel,
  autoFocusName = false,
  onSubmit,
}: SceneLinkFormProps) {
  const ids = {
    name: useId(),
    nameHint: useId(),
    nameError: useId(),
    description: useId(),
    descriptionLabel: useId(),
    descriptionHint: useId(),
    descriptionError: useId(),
    pickerError: useId(),
  }
  const pickerRef = useRef<NonPlayerEntityPickerHandle>(null)
  const [entity, setEntity] = useState<NonPlayerEntityReference | null>(initialValues.nonPlayerEntity)
  const [name, setName] = useState(initialValues.playerFacingName)
  const [clientErrors, setClientErrors] = useState<NonPlayerEntityLinkFormErrors>({})
  const [descriptionChanged, setDescriptionChanged] = useState(false)
  const description = useRef<RichTextDocument | null>(initialValues.playerFacingDescription)
  const errors: NonPlayerEntityLinkFormErrors = { ...serverErrors, ...clientErrors }
  const isDirty = entity !== initialValues.nonPlayerEntity || name !== initialValues.playerFacingName || descriptionChanged
  useUnsavedChangesPrompt(isDirty)

  const focusField = (field: NonPlayerEntityLinkField | null) => {
    if (field === 'nonPlayerEntity') {
      pickerRef.current?.focus()
    } else if (field) {
      document.getElementById(field === 'playerFacingName' ? ids.name : ids.description)?.focus()
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
      focusField(firstInvalidField(serverErrors))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = { nonPlayerEntity: entity, playerFacingName: name, playerFacingDescription: description.current }
    const result = validateNonPlayerEntityLinkForm(values, picker !== undefined)
    if (result.success) {
      setClientErrors({})
      onSubmit(result.data)
      return
    }

    setClientErrors(result.errors)
    focusField(firstInvalidField(result.errors))
  }

  return (
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {picker && (
        <NonPlayerEntityPicker
          ref={pickerRef}
          campaignId={picker.campaignId}
          entities={picker.entities}
          isPending={picker.isPending}
          isError={picker.isError}
          onRetry={picker.onRetry}
          linked={picker.linked}
          value={entity}
          onChange={setEntity}
          error={errors.nonPlayerEntity}
          errorId={ids.pickerError}
        />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.name}>Player-facing name</Label>
        <Input
          id={ids.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={errors.playerFacingName ? true : undefined}
          aria-describedby={[ids.nameHint, errors.playerFacingName ? ids.nameError : undefined].filter(Boolean).join(' ')}
        />
        <p id={ids.nameHint} className="text-sm text-muted-foreground">
          {NAME_HINT}
        </p>
        <FieldError id={ids.nameError} message={errors.playerFacingName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label id={ids.descriptionLabel} htmlFor={ids.description} onClick={() => document.getElementById(ids.description)?.focus()}>
          Player-facing description (optional)
        </Label>
        <RichTextEditor
          id={ids.description}
          labelledBy={ids.descriptionLabel}
          describedBy={errors.playerFacingDescription ? `${ids.descriptionHint} ${ids.descriptionError}` : ids.descriptionHint}
          invalid={Boolean(errors.playerFacingDescription)}
          initialValue={initialValues.playerFacingDescription}
          onChange={(value) => {
            description.current = value
            setDescriptionChanged(true)
          }}
        />
        <p id={ids.descriptionHint} className="text-sm text-muted-foreground">
          {DESCRIPTION_HINT}
        </p>
        <FieldError id={ids.descriptionError} message={errors.playerFacingDescription} />
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
