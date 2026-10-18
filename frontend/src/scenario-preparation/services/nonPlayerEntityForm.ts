import {
  HUMAN_NPC_AGE_MAXIMUM,
  NON_PLAYER_ENTITY_NAME_MAX_LENGTH,
  type NonPlayerEntityType,
} from '@/scenario-preparation/types/NonPlayerEntity'

export interface CreateNonPlayerEntityValues {
  type: NonPlayerEntityType | null
  name: string
  /** What was typed into Age; parsed here so "6x" is refused instead of read as 6. */
  age: string
}

export type CreateNonPlayerEntityField = 'type' | 'name' | 'age'

export type CreateNonPlayerEntityErrors = Partial<Record<CreateNonPlayerEntityField, string>>

export type CreateNonPlayerEntityResult =
  | { success: true; data: { type: NonPlayerEntityType; name: string; age: number | null } }
  | { success: false; errors: CreateNonPlayerEntityErrors }

/** The messages of specs/scenario-preparation/ux.md section 24; the server's 400 on name or age maps to the same copy. */
export const CREATE_MESSAGES = {
  type: 'Choose Human NPC or Mythos Creature.',
  nameRequired: 'Enter a name.',
  nameTooLong: `Name must be ${NON_PLAYER_ENTITY_NAME_MAX_LENGTH} characters or fewer.`,
  ageRequired: 'Enter an age.',
  ageInvalid: `Enter an age from 0 to ${HUMAN_NPC_AGE_MAXIMUM}, in whole years.`,
} as const

/** The field order focus visits when several are invalid. */
export const CREATE_FIELD_ORDER: CreateNonPlayerEntityField[] = ['type', 'name', 'age']

function nameError(name: string): string | undefined {
  if (name === '') {
    return CREATE_MESSAGES.nameRequired
  }
  return name.length > NON_PLAYER_ENTITY_NAME_MAX_LENGTH ? CREATE_MESSAGES.nameTooLong : undefined
}

function ageError(age: string): string | undefined {
  if (age === '') {
    return CREATE_MESSAGES.ageRequired
  }
  return /^\d+$/.test(age) && Number(age) <= HUMAN_NPC_AGE_MAXIMUM ? undefined : CREATE_MESSAGES.ageInvalid
}

/** Validates what the Keeper entered, in the order Type, Name, Age. Age matters only for a Human NPC. */
export function validateCreateNonPlayerEntityForm(values: CreateNonPlayerEntityValues): CreateNonPlayerEntityResult {
  const name = values.name.trim()
  const age = values.age.trim()
  const errors: CreateNonPlayerEntityErrors = {}

  if (values.type === null) {
    errors.type = CREATE_MESSAGES.type
  }
  const nameMessage = nameError(name)
  if (nameMessage) {
    errors.name = nameMessage
  }
  const ageMessage = values.type === 'HumanNpc' ? ageError(age) : undefined
  if (ageMessage) {
    errors.age = ageMessage
  }

  if (Object.keys(errors).length > 0 || values.type === null) {
    return { success: false, errors }
  }

  return { success: true, data: { type: values.type, name, age: values.type === 'HumanNpc' ? Number(age) : null } }
}
