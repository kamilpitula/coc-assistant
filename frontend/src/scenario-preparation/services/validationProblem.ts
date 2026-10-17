import { z } from 'zod'

const validationProblemSchema = z.object({ errors: z.record(z.string(), z.unknown()) })

/** The lower-cased field keys of a ValidationProblemDetails body (any casing from the server); empty for any other body. */
export async function readErrorKeys(response: Response): Promise<string[]> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = validationProblemSchema.safeParse(body)
  return parsed.success ? Object.keys(parsed.data.errors).map((key) => key.toLowerCase()) : []
}
