import { z } from 'zod'

import { richTextSchema } from '@/scenario-preparation/services/sceneApi'

// Strict, so a field the contract does not name (a subject id or recipients on a Player view, another Investigator's id) is rejected,
// not passed on (PBI-SPL-002 D5).
const playerRevealShape = {
  revealId: z.string(),
  revealedAt: z.string(),
  subjectType: z.enum(['Handout', 'NonPlayerEntity', 'Item']),
  title: z.string(),
  handoutKind: z.enum(['ReadAloud', 'Text', 'Image', 'Document', 'Map']).nullable(),
  content: richTextSchema.nullable(),
  file: z.strictObject({ name: z.string(), mediaType: z.string(), sizeBytes: z.number() }).nullable(),
  imageDescription: z.string().nullable(),
}

export const playerRevealSchema = z.strictObject(playerRevealShape)

export const keeperRevealSchema = z.strictObject({
  ...playerRevealShape,
  subjectId: z.string(),
  recipients: z.array(z.strictObject({ id: z.string(), name: z.string().nullable() })),
})

const clueSchema = z.strictObject({
  ...playerRevealShape,
  scene: z.strictObject({ id: z.string(), title: z.string() }),
})

export const cluesSchema = z.strictObject({ investigatorName: z.string().nullable(), clues: z.array(clueSchema) })
