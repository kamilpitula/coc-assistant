import { RICH_TEXT_MAX_BYTES, richTextByteLength } from '@/shared/services/richText'
import {
  SCENE_LOCATION_MAX_LENGTH,
  SCENE_TITLE_MAX_LENGTH,
  type SceneField,
  type SceneInput,
} from '@/scenario-preparation/types/Scene'

const TITLE_REQUIRED = 'Enter a title.'
const TITLE_TOO_LONG = `Title must be ${SCENE_TITLE_MAX_LENGTH} characters or fewer.`
const LOCATION_TOO_LONG = `Location must be ${SCENE_LOCATION_MAX_LENGTH} characters or fewer.`
const KEEPER_NOTES_TOO_LONG = 'Keeper notes are too long. Shorten them and try again.'
const KEEPER_NOTES_REFUSED = "These Keeper notes can't be saved. Shorten them or remove unsupported content."

/** The message shown for a field the server refused (specs/scenario-preparation/ux.md section 13). */
export const SCENE_FIELD_MESSAGES: Record<SceneField, string> = {
  title: TITLE_REQUIRED,
  location: LOCATION_TOO_LONG,
  keeperNotes: KEEPER_NOTES_REFUSED,
}

export type SceneFieldErrors = Partial<Record<SceneField, string>>

export type SceneFormResult = { success: true; data: SceneInput } | { success: false; errors: SceneFieldErrors }

function titleError(title: string): string | undefined {
  if (title === '') {
    return TITLE_REQUIRED
  }
  return title.length > SCENE_TITLE_MAX_LENGTH ? TITLE_TOO_LONG : undefined
}

/** Validates what the Keeper entered, returning the trimmed values or one message per invalid field. */
export function validateSceneForm(values: SceneInput): SceneFormResult {
  const title = values.title.trim()
  const location = values.location.trim()
  const errors: SceneFieldErrors = {}

  const titleMessage = titleError(title)
  if (titleMessage) {
    errors.title = titleMessage
  }
  if (location.length > SCENE_LOCATION_MAX_LENGTH) {
    errors.location = LOCATION_TOO_LONG
  }
  if (values.keeperNotes && richTextByteLength(values.keeperNotes) > RICH_TEXT_MAX_BYTES) {
    errors.keeperNotes = KEEPER_NOTES_TOO_LONG
  }

  return Object.keys(errors).length === 0
    ? { success: true, data: { title, location, keeperNotes: values.keeperNotes } }
    : { success: false, errors }
}
