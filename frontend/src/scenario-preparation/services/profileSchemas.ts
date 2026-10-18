import { z } from 'zod'

/** The Investigator Difficulty the server works out for an Opposing Value (CONTEXT.md). */
export const difficultySchema = z.enum(['Regular', 'Hard', 'Extreme'])

// Only the inside of keeperNotes is loose: the editor and the server validate the nodes (ADR 0015).
export const richTextSchema = z.looseObject({
  root: z.looseObject({ type: z.literal('root'), children: z.array(z.unknown()) }),
})
