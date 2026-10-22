import {
  HANDOUT_TITLE_MAX_LENGTH,
  type HandoutField,
  type HandoutInput,
  type HandoutKind,
  type HandoutVisibility,
} from '@/scenario-preparation/types/Handout'
import { isEmptyRichText, RICH_TEXT_MAX_BYTES, richTextByteLength } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

const TITLE_REQUIRED = 'Enter a title.'
const TITLE_TOO_LONG = `Title must be ${HANDOUT_TITLE_MAX_LENGTH} characters or fewer.`
const KIND_REQUIRED = 'Choose Read-aloud or Text.'
const VISIBILITY_REQUIRED = 'Choose who can see this Handout.'
const CONTENT_REQUIRED = 'Enter the Handout text.'
const CONTENT_TOO_LONG = 'The text is too long. Shorten it and try again.'

/** The conflict shown at the form when the Scene was finished meanwhile (ux.md section 16). */
export const HANDOUT_SCENE_FINISHED_MEANWHILE = "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel."

export type HandoutFormErrors = Partial<Record<HandoutField, string>>

/** What the form holds: a kind and visibility are null until chosen, and the text is null until typed. */
export interface HandoutFormValues {
  title: string
  kind: HandoutKind | null
  visibility: HandoutVisibility | null
  content: RichTextDocument | null
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

/**
 * Validates what the Keeper entered, in the order title, kind, visibility, text (specs/scenario-preparation/ux.md section 43).
 * Returns the trimmed title or one message per invalid field.
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
  const contentMessage = contentError(values.content)
  if (contentMessage) {
    errors.content = contentMessage
  }

  if (Object.keys(errors).length > 0 || values.kind === null || values.visibility === null || values.content === null) {
    return { success: false, errors }
  }

  return { success: true, data: { title, kind: values.kind, visibility: values.visibility, content: values.content } }
}

const FIELD_ORDER: HandoutField[] = ['title', 'kind', 'visibility', 'content']

/** The field that gets focus first when the form is refused, in the order title, kind, visibility, text. */
export function firstInvalidField(errors: HandoutFormErrors): HandoutField | null {
  return FIELD_ORDER.find((field) => errors[field]) ?? null
}
