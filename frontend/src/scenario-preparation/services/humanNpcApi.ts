import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { NonPlayerEntityNotFoundError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import type { HumanNpc, HumanNpcInput, ValidationProblem } from '@/scenario-preparation/types/HumanNpc'

const difficultySchema = z.enum(['Regular', 'Hard', 'Extreme'])

const detailsSchema = z.strictObject({
  professionOrRole: z.string().nullable(),
  shortDescription: z.string().nullable(),
  goal: z.string().nullable(),
  relationshipToInvestigators: z.string().nullable(),
  knowledge: z.string().nullable(),
  secrets: z.string().nullable(),
  behaviorCue: z.string().nullable(),
})

// Only the inside of keeperNotes is loose: the editor and the server validate the nodes (ADR 0015).
const richTextSchema = z.looseObject({
  root: z.looseObject({ type: z.literal('root'), children: z.array(z.unknown()) }),
})

const derivedSchema = z.strictObject({
  hitPoints: z.number().nullable(),
  magicPoints: z.number().nullable(),
  damageBonus: z.string().nullable(),
  build: z.number().nullable(),
  movementRate: z.number().nullable(),
  movementRateNotCovered: z.boolean(),
})

const characteristicsSchema = z.strictObject({
  values: z.record(z.string(), z.number().nullable()),
  difficulty: z.record(z.string(), difficultySchema),
  derived: derivedSchema,
})

const skillSchema = z.strictObject({
  name: z.string().nullable(),
  specialization: z.string().nullable(),
  value: z.number().nullable(),
  difficulty: difficultySchema,
})

const weaponSchema = z.strictObject({
  name: z.string().nullable(),
  skill: z.strictObject({ name: z.string().nullable(), specialization: z.string().nullable() }).nullable(),
  damage: z.string().nullable(),
  attacksPerRound: z.number().nullable(),
  range: z.string().nullable(),
  ammunition: z.string().nullable(),
  malfunction: z.string().nullable(),
  impaling: z.boolean(),
})

const combatSchema = z.strictObject({
  dodge: z.number().nullable(),
  dodgeDifficulty: difficultySchema.nullable(),
  armorPoints: z.number().nullable(),
  tacticsAndMorale: z.string().nullable(),
  weapons: z.array(weaponSchema),
})

const spellSchema = z.strictObject({
  name: z.string().nullable(),
  magicPointCost: z.string().nullable(),
  effect: z.string().nullable(),
})

const humanNpcSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  age: z.number().nullable(),
  details: detailsSchema,
  keeperNotes: richTextSchema.nullable(),
  characteristics: characteristicsSchema.nullable(),
  skills: z.array(skillSchema).nullable(),
  combat: combatSchema.nullable(),
  spells: z.array(spellSchema).nullable(),
})

/** The API answered 400 with the refused values, keyed by lower-cased request path (ADR 0018). */
export class HumanNpcValidationError extends Error {
  readonly problems: ValidationProblem[]

  constructor(problems: ValidationProblem[]) {
    super('The Human NPC was refused')
    this.name = 'HumanNpcValidationError'
    this.problems = problems
  }
}

const humanNpcsUrl = (campaignId: string): string => `/api/campaigns/${campaignId}/human-npcs`

async function failWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new NonPlayerEntityNotFoundError()
  }
  if (response.status === 400) {
    throw new HumanNpcValidationError(await readValidationProblems(response))
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

/** Calls GET .../human-npcs/{humanNpcId}; null when the API answers 404. */
export async function getHumanNpc(accessToken: string, campaignId: string, humanNpcId: string): Promise<HumanNpc | null> {
  const response = await fetch(`${humanNpcsUrl(campaignId)}/${humanNpcId}`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Human NPC (${response.status})`)
  }

  return humanNpcSchema.parse(await response.json())
}

/** Calls POST .../human-npcs, which creates a Human NPC from its name and age. */
export async function createHumanNpc(accessToken: string, campaignId: string, name: string, age: number): Promise<HumanNpc> {
  const response = await fetch(humanNpcsUrl(campaignId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name, age }),
  })

  if (!response.ok) {
    return failWrite(response, 'create the Human NPC')
  }

  return humanNpcSchema.parse(await response.json())
}

/** Calls PUT .../human-npcs/{humanNpcId}, which replaces the name and the whole NPC Profile. */
export async function editHumanNpc(accessToken: string, campaignId: string, humanNpcId: string, input: HumanNpcInput): Promise<HumanNpc> {
  const response = await fetch(`${humanNpcsUrl(campaignId)}/${humanNpcId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    return failWrite(response, 'save the Human NPC')
  }

  return humanNpcSchema.parse(await response.json())
}

/** Calls DELETE .../human-npcs/{humanNpcId}. */
export async function deleteHumanNpc(accessToken: string, campaignId: string, humanNpcId: string): Promise<void> {
  const response = await fetch(`${humanNpcsUrl(campaignId)}/${humanNpcId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    throw new NonPlayerEntityNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to delete the Human NPC (${response.status})`)
  }
}
