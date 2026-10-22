import {
  PLAYER_FACING_NAME_MAX_LENGTH,
  type NonPlayerEntityLinkField,
  type NonPlayerEntityLinkInput,
  type NonPlayerEntityReference,
} from '@/scenario-preparation/types/Scene'
import { RICH_TEXT_MAX_BYTES, richTextByteLength } from '@/shared/services/richText'

const ENTITY_REQUIRED = 'Choose a Non-Player Entity.'
const NAME_REQUIRED = 'Enter a Player-facing name.'
const NAME_TOO_LONG = `Player-facing name must be ${PLAYER_FACING_NAME_MAX_LENGTH} characters or fewer.`
const DESCRIPTION_TOO_LONG = 'Player-facing description is too long. Shorten it and try again.'

/** The conflict shown at the form when the Scene was finished meanwhile (ux.md section 33). */
export const LINK_SCENE_FINISHED_MEANWHILE = "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel."

export type NonPlayerEntityLinkFormErrors = Partial<Record<NonPlayerEntityLinkField, string>>

export interface NonPlayerEntityLinkFormValues extends NonPlayerEntityLinkInput {
  /** The picker's choice; null until one is made. Ignored when the form does not pick an entity (editing). */
  nonPlayerEntity: NonPlayerEntityReference | null
}

export type NonPlayerEntityLinkFormResult =
  | { success: true; data: NonPlayerEntityLinkInput & { nonPlayerEntity: NonPlayerEntityReference | null } }
  | { success: false; errors: NonPlayerEntityLinkFormErrors }

function nameError(name: string): string | undefined {
  if (name === '') {
    return NAME_REQUIRED
  }
  return name.length > PLAYER_FACING_NAME_MAX_LENGTH ? NAME_TOO_LONG : undefined
}

/**
 * Validates what the Keeper entered, in the order entity, name, description (specs/scenario-preparation/ux.md section 33).
 * Returns the trimmed name or one message per invalid field. Editing passes `picksEntity` false: the entity is fixed.
 */
export function validateNonPlayerEntityLinkForm(values: NonPlayerEntityLinkFormValues, picksEntity: boolean): NonPlayerEntityLinkFormResult {
  const name = values.playerFacingName.trim()
  const errors: NonPlayerEntityLinkFormErrors = {}

  if (picksEntity && values.nonPlayerEntity === null) {
    errors.nonPlayerEntity = ENTITY_REQUIRED
  }
  const message = nameError(name)
  if (message) {
    errors.playerFacingName = message
  }
  if (values.playerFacingDescription && richTextByteLength(values.playerFacingDescription) > RICH_TEXT_MAX_BYTES) {
    errors.playerFacingDescription = DESCRIPTION_TOO_LONG
  }

  return Object.keys(errors).length === 0
    ? {
        success: true,
        data: { nonPlayerEntity: values.nonPlayerEntity, playerFacingName: name, playerFacingDescription: values.playerFacingDescription },
      }
    : { success: false, errors }
}

/** The field that gets focus first when the form is refused, in the order entity, name, description. */
export function firstInvalidField(errors: NonPlayerEntityLinkFormErrors): NonPlayerEntityLinkField | null {
  if (errors.nonPlayerEntity) {
    return 'nonPlayerEntity'
  }
  if (errors.playerFacingName) {
    return 'playerFacingName'
  }
  return errors.playerFacingDescription ? 'playerFacingDescription' : null
}
