import { z } from 'zod'

import type { ValidationProblem } from '@/scenario-preparation/types/HumanNpc'

const validationProblemSchema = z.object({ errors: z.record(z.string(), z.unknown()) })

/** The lower-cased field keys of a ValidationProblemDetails body (any casing from the server); empty for any other body. */
export async function readErrorKeys(response: Response): Promise<string[]> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = validationProblemSchema.safeParse(body)
  return parsed.success ? Object.keys(parsed.data.errors).map((key) => key.toLowerCase()) : []
}

/**
 * The refused values of a ValidationProblemDetails body: each lower-cased request path (ADR 0018) with the server's
 * messages. Empty for any other body.
 */
export async function readValidationProblems(response: Response): Promise<ValidationProblem[]> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = validationProblemSchema.safeParse(body)
  if (!parsed.success) {
    return []
  }

  return Object.entries(parsed.data.errors).map(([path, messages]) => ({
    path: path.toLowerCase(),
    messages: Array.isArray(messages) ? messages.filter((message): message is string => typeof message === 'string') : [],
  }))
}
