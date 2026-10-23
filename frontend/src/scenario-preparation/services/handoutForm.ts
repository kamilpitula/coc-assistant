import { validateHandoutFile } from '@/scenario-preparation/services/handoutFile'
import {
  HANDOUT_KIND_FAMILIES,
  HANDOUT_TITLE_MAX_LENGTH,
  type FileHandoutKind,
  type HandoutField,
  type HandoutFileDetails,
  type HandoutInput,
  type HandoutKind,
  type HandoutVisibility,
  type RichTextHandoutKind,
} from '@/scenario-preparation/types/Handout'
import { isEmptyRichText, RICH_TEXT_MAX_BYTES, richTextByteLength } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

const TITLE_REQUIRED = 'Enter a title.'
const TITLE_TOO_LONG = `Title must be ${HANDOUT_TITLE_MAX_LENGTH} characters or fewer.`
const KIND_REQUIRED = 'Choose a kind.'
const VISIBILITY_REQUIRED = 'Choose who can see this Handout.'
const CONTENT_REQUIRED = 'Enter the Handout text.'
const CONTENT_TOO_LONG = 'The text is too long. Shorten it and try again.'

/** The conflict shown at the form when the Scene was finished meanwhile (ux.md section 16). */
export const HANDOUT_SCENE_FINISHED_MEANWHILE = "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel."

export type HandoutFormErrors = Partial<Record<HandoutField, string>>

/**
 * What the form holds: a kind and visibility are null until chosen, the text is null until typed, and the file is null until an
 * image or PDF is chosen. `hasStoredFile` is true when editing a file Handout, which may keep its stored file.
 */
export interface HandoutFormValues {
  title: string
  kind: HandoutKind | null
  visibility: HandoutVisibility | null
  content: RichTextDocument | null
  file?: File | null
  hasStoredFile?: boolean
  /** The file an edit starts from; the form shows it and lets it be kept. */
  storedFile?: HandoutFileDetails | null
}

export type HandoutFormResult = { success: true; data: HandoutInput } | { success: false; errors: HandoutFormErrors }

function titleError(title: string): string | undefined {
  if (title === '') {
    return TITLE_REQUIRED
  }
  return title.length > HANDOUT_TITLE_MAX_LENGTH ? TITLE_TOO_LONG : undefined
}

function contentError(content: RichTextDocument | null): string | undefined {
  if (isEmptyRichText(content)) {
    return CONTENT_REQUIRED
  }
  return content && richTextByteLength(content) > RICH_TEXT_MAX_BYTES ? CONTENT_TOO_LONG : undefined
}

// Only the field the kind shows is checked: an edit may keep its stored file, and text typed before switching kinds is ignored.
function contentFieldErrors(values: HandoutFormValues, kind: HandoutKind): HandoutFormErrors {
  const family = HANDOUT_KIND_FAMILIES[kind]
  if (family === 'richText') {
    const message = contentError(values.content)
    return message ? { content: message } : {}
  }

  const file = values.file ?? null
  const message = file === null && values.hasStoredFile ? undefined : validateHandoutFile(family, file)
  return message ? { file: message } : {}
}

function toInput(values: HandoutFormValues, kind: HandoutKind, visibility: HandoutVisibility, title: string): HandoutInput | null {
  if (HANDOUT_KIND_FAMILIES[kind] === 'richText') {
    return values.content ? { kind: kind as RichTextHandoutKind, visibility, title, content: values.content } : null
  }
  return { kind: kind as FileHandoutKind, visibility, title, file: values.file ?? null }
}

/**
 * Validates what the Keeper entered, in the order title, kind, visibility, then the field the kind shows: the text, or the image
 * or PDF (specs/scenario-preparation/ux.md sections 43 and 51). Returns the trimmed title or one message per invalid field.
 */
export function validateHandoutForm(values: HandoutFormValues): HandoutFormResult {
  const title = values.title.trim()
  const errors: HandoutFormErrors = {}

  const titleMessage = titleError(title)
  if (titleMessage) {
    errors.title = titleMessage
  }
  if (values.kind === null) {
    errors.kind = KIND_REQUIRED
  }
  if (values.visibility === null) {
    errors.visibility = VISIBILITY_REQUIRED
  }
  if (values.kind !== null) {
    Object.assign(errors, contentFieldErrors(values, values.kind))
  }

  if (Object.keys(errors).length > 0 || values.kind === null || values.visibility === null) {
    return { success: false, errors }
  }

  const data = toInput(values, values.kind, values.visibility, title)
  return data ? { success: true, data } : { success: false, errors }
}

const FIELD_ORDER: HandoutField[] = ['title', 'kind', 'visibility', 'content', 'file']

/** The field that gets focus first when the form is refused, in the order title, kind, visibility, text, file. */
export function firstInvalidField(errors: HandoutFormErrors): HandoutField | null {
  return FIELD_ORDER.find((field) => errors[field]) ?? null
}
