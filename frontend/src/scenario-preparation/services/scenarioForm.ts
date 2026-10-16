import { z } from 'zod'

import {
  SCENARIO_KEEPER_NOTES_MAX_LENGTH,
  SCENARIO_TITLE_MAX_LENGTH,
  type ScenarioField,
  type ScenarioInput,
} from '@/scenario-preparation/types/Scenario'

const TITLE_REQUIRED = 'Enter a title.'
const TITLE_TOO_LONG = `Title must be ${SCENARIO_TITLE_MAX_LENGTH} characters or fewer.`
const KEEPER_NOTES_TOO_LONG = `Keeper notes must be ${SCENARIO_KEEPER_NOTES_MAX_LENGTH.toLocaleString('en-US')} characters or fewer.`

/** The message shown for a field the server refused (specs/scenario-preparation/ux.md section 4). */
export const SCENARIO_FIELD_MESSAGES: Record<ScenarioField, string> = {
  title: TITLE_REQUIRED,
  keeperNotes: KEEPER_NOTES_TOO_LONG,
}

const scenarioFormSchema = z.object({
  title: z.string().trim().min(1, TITLE_REQUIRED).max(SCENARIO_TITLE_MAX_LENGTH, TITLE_TOO_LONG),
  keeperNotes: z.string().trim().max(SCENARIO_KEEPER_NOTES_MAX_LENGTH, KEEPER_NOTES_TOO_LONG),
})

export type ScenarioFieldErrors = Partial<Record<ScenarioField, string>>

export type ScenarioFormResult = { success: true; data: ScenarioInput } | { success: false; errors: ScenarioFieldErrors }

function isScenarioField(field: PropertyKey | undefined): field is ScenarioField {
  return field === 'title' || field === 'keeperNotes'
}

/** Validates what the Keeper typed, returning the trimmed values or one message per invalid field. */
export function validateScenarioForm(values: ScenarioInput): ScenarioFormResult {
  const result = scenarioFormSchema.safeParse(values)
  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: ScenarioFieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]
    if (isScenarioField(field) && !errors[field]) {
      errors[field] = issue.message
    }
  }
  return { success: false, errors }
}
