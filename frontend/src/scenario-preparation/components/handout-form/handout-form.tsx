import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'

import { HandoutContentField } from '@/scenario-preparation/components/handout-content-field/handout-content-field'
import type { HandoutFieldErrors } from '@/scenario-preparation/services/handoutApi'
import type { HandoutFileFamily } from '@/scenario-preparation/services/handoutFile'
import {
  firstInvalidField,
  validateHandoutForm,
  type HandoutFormErrors,
  type HandoutFormValues,
} from '@/scenario-preparation/services/handoutForm'
import {
  HANDOUT_KIND_FAMILIES,
  type HandoutField,
  type HandoutInput,
  type HandoutKind,
  type HandoutVisibility,
} from '@/scenario-preparation/types/Handout'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'
import type { RichTextDocument } from '@/shared/types/RichText'

const KIND_OPTIONS: ChoiceOption<HandoutKind>[] = [
  { value: 'ReadAloud', label: 'Read-aloud', description: 'Text you read to the Players. It is shown as read-aloud text.' },
  { value: 'Text', label: 'Text', description: 'Any other text, such as a letter or a newspaper clipping.' },
  { value: 'Image', label: 'Image', description: 'A picture, such as a photograph or a portrait.' },
  { value: 'Document', label: 'Document', description: 'A PDF, such as a letter, a diary, or a newspaper.' },
  { value: 'Map', label: 'Map', description: 'A picture of a place, such as a house or a town. It is shown large.' },
]

const VISIBILITY_OPTIONS: ChoiceOption<HandoutVisibility>[] = [
  { value: 'PlayerFacing', label: 'Player-facing', description: 'Players can receive it when you reveal it.' },
  { value: 'KeeperFacing', label: 'Keeper-facing', description: 'Only you can read it. It is never revealed.' },
]

const DOCUMENT_STAYS_A_DOCUMENT = 'Document. A Document Handout stays a Document.'

/** An edit offers the kinds of its own family only (SP-UX-86); a new Handout offers all five. */
function kindOptionsFor(initialKind: HandoutKind | null): ChoiceOption<HandoutKind>[] {
  if (initialKind === null) {
    return KIND_OPTIONS
  }
  const family = HANDOUT_KIND_FAMILIES[initialKind]
  return KIND_OPTIONS.filter((option) => HANDOUT_KIND_FAMILIES[option.value] === family)
}

interface HandoutFormProps {
  initialValues: HandoutFormValues
  submitLabel: string
  /** The submit button's text while `pending`, for example "Adding...". */
  busyLabel: string
  pending: boolean
  /** The last save failed or was refused; announced as an alert and the typed values stay. */
  failureMessage?: string | null
  /** Messages the server returned for the last save, by field. */
  serverErrors?: HandoutFieldErrors
  /** The secondary action: a link back to the Scene, or a Cancel button. */
  cancel: ReactNode
  /** Moves focus to the title when the form appears (editing). */
  autoFocusTitle?: boolean
  onSubmit: (input: HandoutInput) => void
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

interface ChoiceOption<TValue extends string> {
  value: TValue
  label: string
  description: string
}

interface ChoiceGroupProps<TValue extends string> {
  legend: string
  idPrefix: string
  options: ChoiceOption<TValue>[]
  value: TValue | null
  onChange: (value: TValue) => void
  error?: string
  errorId: string
  /** Replaces the radios with a sentence, for a kind that cannot change (SP-A11Y-50). */
  fixedText?: string
}

/** A fieldset with a legend and a radiogroup; each radio is named by its label and described by its sentence (SP-A11Y-39). */
function ChoiceGroup<TValue extends string>({ legend, idPrefix, options, value, onChange, error, errorId, fixedText }: ChoiceGroupProps<TValue>) {
  const legendId = `${idPrefix}-legend`

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="flex min-w-0 flex-col gap-2">
      <legend id={legendId} className="text-sm font-medium">
        {legend}
      </legend>
      {fixedText ? (
        <p className="text-sm">{fixedText}</p>
      ) : (
        <RadioGroup
          value={value ?? ''}
          onValueChange={(next) => onChange(next as TValue)}
          aria-labelledby={legendId}
          aria-invalid={error ? true : undefined}
          className="gap-3"
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupItem
                value={option.value}
                id={`${idPrefix}-${option.value}`}
                aria-describedby={`${idPrefix}-${option.value}-description`}
                className="mt-1 size-4 shrink-0"
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={`${idPrefix}-${option.value}`}>{option.label}</Label>
                <p id={`${idPrefix}-${option.value}-description`} className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      )}
      <FieldError id={errorId} message={error} />
    </fieldset>
  )
}

/**
 * The title, kind, visibility, and content form shared by the add and edit pages (specs/scenario-preparation/ux.md sections 43
 * and 51). Neither the kind nor the visibility has a default, and the kind decides the content field: text, or an image or PDF.
 * Validates on submit, explains each invalid field next to it, focuses the first invalid field, and warns before leaving with
 * unsaved edits.
 */
export function HandoutForm({
  initialValues,
  submitLabel,
  busyLabel,
  pending,
  failureMessage,
  serverErrors,
  cancel,
  autoFocusTitle = false,
  onSubmit,
}: HandoutFormProps) {
  const ids = {
    title: useId(),
    titleError: useId(),
    kind: useId(),
    kindError: useId(),
    visibility: useId(),
    visibilityError: useId(),
    content: useId(),
    contentLabel: useId(),
    contentHint: useId(),
    contentError: useId(),
    file: useId(),
    fileError: useId(),
  }
  const [title, setTitle] = useState(initialValues.title)
  const [kind, setKind] = useState(initialValues.kind)
  const [visibility, setVisibility] = useState(initialValues.visibility)
  const [text, setText] = useState<RichTextDocument | null>(initialValues.content)
  const [files, setFiles] = useState<Record<HandoutFileFamily, File | null>>({ picture: null, document: null })
  const [clientErrors, setClientErrors] = useState<HandoutFormErrors>({})
  const [contentChanged, setContentChanged] = useState(false)
  const errors: HandoutFormErrors = { ...serverErrors, ...clientErrors }
  const kindOptions = kindOptionsFor(initialValues.kind)
  useUnsavedChangesPrompt(isFormDirty(initialValues, { title, kind, visibility, contentChanged, files }))

  const focusField = (field: HandoutField | null) => {
    const targets: Record<HandoutField, string> = {
      title: ids.title,
      kind: `${ids.kind}-${kindOptions[0].value}`,
      visibility: `${ids.visibility}-${VISIBILITY_OPTIONS[0].value}`,
      content: ids.content,
      file: ids.file,
    }
    if (field) {
      document.getElementById(targets[field])?.focus()
    }
  }

  useEffect(() => {
    if (autoFocusTitle) {
      document.getElementById(ids.title)?.focus()
    }
    // Focus once, when the form appears (editing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusTitle])

  // A refusal from the server is explained like a local one, with focus on the first invalid field.
  useEffect(() => {
    if (serverErrors) {
      focusField(firstInvalidField(serverErrors))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateHandoutForm({
      title,
      kind,
      visibility,
      content: text,
      file: kind ? files[fileFamilyOf(kind)] : null,
      hasStoredFile: Boolean(initialValues.storedFile),
    })
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
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.title}>Title</Label>
        <Input
          id={ids.title}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? ids.titleError : undefined}
        />
        <FieldError id={ids.titleError} message={errors.title} />
      </div>

      <ChoiceGroup
        legend="Kind"
        idPrefix={ids.kind}
        options={kindOptions}
        value={kind}
        onChange={setKind}
        error={errors.kind}
        errorId={ids.kindError}
        fixedText={isKindFixed(initialValues.kind) ? DOCUMENT_STAYS_A_DOCUMENT : undefined}
      />

      <ChoiceGroup
        legend="Who can see it"
        idPrefix={ids.visibility}
        options={VISIBILITY_OPTIONS}
        value={visibility}
        onChange={setVisibility}
        error={errors.visibility}
        errorId={ids.visibilityError}
      />

      <HandoutContentField
        kind={kind}
        ids={ids}
        textInitialValue={text}
        onTextChange={(value) => {
          setText(value)
          setContentChanged(true)
        }}
        files={files}
        onFileChange={(family, file) => setFiles((current) => ({ ...current, [family]: file }))}
        storedFile={initialValues.storedFile}
        contentError={errors.content}
        fileError={errors.file}
      />

      <FormActions failureMessage={failureMessage} pending={pending} submitLabel={submitLabel} busyLabel={busyLabel} cancel={cancel} />
    </form>
  )
}

interface FormActionsProps {
  failureMessage?: string | null
  pending: boolean
  submitLabel: string
  busyLabel: string
  cancel: ReactNode
}

function FormActions({ failureMessage, pending, submitLabel, busyLabel, cancel }: FormActionsProps) {
  return (
    <>
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
    </>
  )
}

// A Document stays a Document, so its kind is a sentence instead of a choice (SP-A11Y-50).
const isKindFixed = (initialKind: HandoutKind | null): boolean => initialKind !== null && HANDOUT_KIND_FAMILIES[initialKind] === 'document'

interface FormState {
  title: string
  kind: HandoutKind | null
  visibility: HandoutVisibility | null
  contentChanged: boolean
  files: Record<HandoutFileFamily, File | null>
}

function isFormDirty(initial: HandoutFormValues, state: FormState): boolean {
  return (
    state.title !== initial.title ||
    state.kind !== initial.kind ||
    state.visibility !== initial.visibility ||
    state.contentChanged ||
    state.files.picture !== null ||
    state.files.document !== null
  )
}

// The family of a kind that holds a file; a rich-text kind has none, so its form value is never read.
function fileFamilyOf(kind: HandoutKind): HandoutFileFamily {
  return HANDOUT_KIND_FAMILIES[kind] === 'document' ? 'document' : 'picture'
}
