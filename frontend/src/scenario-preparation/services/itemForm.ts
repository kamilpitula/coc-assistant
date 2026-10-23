import { ITEM_NAME_MAX_LENGTH, type ItemField, type ItemFormValues, type ItemInput } from '@/scenario-preparation/types/Item'
import { isEmptyRichText, RICH_TEXT_MAX_BYTES, richTextByteLength } from '@/shared/services/richText'

const NAME_REQUIRED = 'Enter a name.'
const NAME_TOO_LONG = `Name must be ${ITEM_NAME_MAX_LENGTH} characters or fewer.`
const DESCRIPTION_REQUIRED = 'Enter a Player-facing description.'
const DESCRIPTION_TOO_LONG = 'Player-facing description is too long. Shorten it and try again.'
const KEEPER_NOTES_TOO_LONG = 'Keeper notes are too long. Shorten them and try again.'

/** The fields in the order they are checked and focused: Name, Player-facing description, Keeper notes (ux.md section 62). */
export const ITEM_FIELD_ORDER: readonly ItemField[] = ['name', 'playerFacingDescription', 'keeperNotes']

export type ItemFormErrors = Partial<Record<ItemField, string>>

export type ItemFormResult = { success: true; data: ItemInput } | { success: false; errors: ItemFormErrors }

function nameError(name: string): string | undefined {
  if (name === '') {
    return NAME_REQUIRED
  }
  return name.length > ITEM_NAME_MAX_LENGTH ? NAME_TOO_LONG : undefined
}

function descriptionError(description: ItemFormValues['playerFacingDescription']): string | undefined {
  if (!description || isEmptyRichText(description)) {
    return DESCRIPTION_REQUIRED
  }
  return richTextByteLength(description) > RICH_TEXT_MAX_BYTES ? DESCRIPTION_TOO_LONG : undefined
}

/** Validates what the Keeper entered, returning the trimmed name or one message per invalid field (specs/scenario-preparation/ux.md section 62). */
export function validateItemForm(values: ItemFormValues): ItemFormResult {
  const name = values.name.trim()
  const errors: ItemFormErrors = {}

  const nameMessage = nameError(name)
  if (nameMessage) {
    errors.name = nameMessage
  }
  const descriptionMessage = descriptionError(values.playerFacingDescription)
  if (descriptionMessage) {
    errors.playerFacingDescription = descriptionMessage
  }
  if (values.keeperNotes && richTextByteLength(values.keeperNotes) > RICH_TEXT_MAX_BYTES) {
    errors.keeperNotes = KEEPER_NOTES_TOO_LONG
  }

  if (Object.keys(errors).length > 0 || !values.playerFacingDescription) {
    return { success: false, errors }
  }

  return { success: true, data: { name, playerFacingDescription: values.playerFacingDescription, keeperNotes: values.keeperNotes } }
}

/** The first invalid field in the order they are checked; focus goes there. */
export function firstInvalidItemField(errors: ItemFormErrors): ItemField | undefined {
  return ITEM_FIELD_ORDER.find((field) => errors[field])
}
