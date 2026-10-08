import type { ValidationError } from '@/campaign-play/types/CharacterSheet'

/** A ValidationError with severity Error (specs/character-sheet/spec.md, Validation). */
export function validationError(code: string, field: string, message: string, expected: string | null = null, actual: string | null = null): ValidationError {
  return { code, field, message, expected, actual, severity: 'Error' }
}

/** A ValidationError with severity Warning, which never blocks submission. */
export function validationWarning(code: string, field: string, message: string, expected: string | null = null, actual: string | null = null): ValidationError {
  return { code, field, message, expected, actual, severity: 'Warning' }
}
