import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import { failNonPlayerEntityWrite, NonPlayerEntityInUseError, NonPlayerEntityNotFoundError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { difficultySchema, richTextSchema } from '@/scenario-preparation/services/profileSchemas'
import { CREATURE_KINDS, MOVEMENT_MODES, type MythosCreature, type MythosCreatureInput } from '@/scenario-preparation/types/MythosCreature'

const detailsSchema = z.strictObject({
  creatureKind: z.enum(CREATURE_KINDS).nullable(),
  descriptionAndSensoryCues: z.string().nullable(),
  origin: z.string().nullable(),
  goalAndBehavior: z.string().nullable(),
  signsAndTraces: z.string().nullable(),
  defeatOutcome: z.string().nullable(),
  specimenRangeNotes: z.string().nullable(),
})

const numberOverrideSchema = z.strictObject({ value: z.number().nullable(), reason: z.string().nullable() })
const damageBonusOverrideSchema = z.strictObject({ value: z.string().nullable(), reason: z.string().nullable() })

const overridesSchema = z.strictObject({
  hitPoints: numberOverrideSchema.nullable(),
  magicPoints: numberOverrideSchema.nullable(),
  damageBonus: damageBonusOverrideSchema.nullable(),
  build: numberOverrideSchema.nullable(),
})

// There is no MOV: the strict object rejects it, as it rejects any field the contract does not name.
const derivedSchema = z.strictObject({
  hitPoints: z.number().nullable(),
  magicPoints: z.number().nullable(),
  damageBonus: z.string().nullable(),
  build: z.number().nullable(),
})

const characteristicsSchema = z.strictObject({
  values: z.record(z.string(), z.number().nullable()),
  hitPointsNotApplicable: z.boolean(),
  overrides: overridesSchema,
  difficulty: z.record(z.string(), difficultySchema),
  derived: derivedSchema,
})

const movementSchema = z.strictObject({
  mode: z.enum(MOVEMENT_MODES),
  label: z.string().nullable(),
  rate: z.number().nullable(),
})

const attackSchema = z.strictObject({
  name: z.string().nullable(),
  skill: z.string().nullable(),
  skillValue: z.number().nullable(),
  difficulty: difficultySchema,
  damage: z.string().nullable(),
  effect: z.string().nullable(),
  manoeuvre: z.boolean(),
})

const combatSchema = z.strictObject({
  attacksPerRound: z.number().nullable(),
  dodge: z.number().nullable(),
  dodgeDifficulty: difficultySchema.nullable(),
  attacks: z.array(attackSchema),
})

const defenseEntrySchema = z.strictObject({ description: z.string().nullable() })

const defensesSchema = z.strictObject({
  armorPoints: z.number().nullable(),
  armorNote: z.string().nullable(),
  immunities: z.array(defenseEntrySchema),
  vulnerabilities: z.array(defenseEntrySchema),
})

const skillSchema = z.strictObject({ name: z.string().nullable(), value: z.number().nullable(), difficulty: difficultySchema })

const spellSchema = z.strictObject({
  name: z.string().nullable(),
  magicPointCost: z.string().nullable(),
  effect: z.string().nullable(),
})

const powerSchema = z.strictObject({
  name: z.string().nullable(),
  magicPointCost: z.string().nullable(),
  effect: z.string().nullable(),
  limits: z.string().nullable(),
})

const mythosCreatureSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  details: detailsSchema,
  keeperNotes: richTextSchema.nullable(),
  characteristics: characteristicsSchema.nullable(),
  movement: z.array(movementSchema).nullable(),
  combat: combatSchema.nullable(),
  defenses: defensesSchema.nullable(),
  skills: z.array(skillSchema).nullable(),
  spells: z.array(spellSchema).nullable(),
  powers: z.array(powerSchema).nullable(),
  sanityLoss: z.strictObject({ value: z.string().nullable() }).nullable(),
})

const mythosCreaturesUrl = (campaignId: string): string => `/api/campaigns/${campaignId}/mythos-creatures`

/** Calls GET .../mythos-creatures/{mythosCreatureId}; null when the API answers 404. */
export async function getMythosCreature(accessToken: string, campaignId: string, mythosCreatureId: string): Promise<MythosCreature | null> {
  const response = await fetch(`${mythosCreaturesUrl(campaignId)}/${mythosCreatureId}`, { headers: authHeaders(accessToken) })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Mythos Creature (${response.status})`)
  }

  return mythosCreatureSchema.parse(await response.json())
}

/** Calls POST .../mythos-creatures, which creates a Mythos Creature from its name alone. */
export async function createMythosCreature(accessToken: string, campaignId: string, name: string): Promise<MythosCreature> {
  const response = await fetch(mythosCreaturesUrl(campaignId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    return failNonPlayerEntityWrite(response, 'create the Mythos Creature')
  }

  return mythosCreatureSchema.parse(await response.json())
}

/** Calls PUT .../mythos-creatures/{mythosCreatureId}, which replaces the name and the whole Monster Profile. */
export async function editMythosCreature(
  accessToken: string,
  campaignId: string,
  mythosCreatureId: string,
  input: MythosCreatureInput,
): Promise<MythosCreature> {
  const response = await fetch(`${mythosCreaturesUrl(campaignId)}/${mythosCreatureId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    return failNonPlayerEntityWrite(response, 'save the Mythos Creature')
  }

  return mythosCreatureSchema.parse(await response.json())
}

/** Calls POST .../mythos-creatures/{mythosCreatureId}/duplicate, which creates a copy in the same Campaign; the server names it. */
export async function duplicateMythosCreature(accessToken: string, campaignId: string, mythosCreatureId: string): Promise<MythosCreature> {
  const response = await fetch(`${mythosCreaturesUrl(campaignId)}/${mythosCreatureId}/duplicate`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })

  if (!response.ok) {
    return failNonPlayerEntityWrite(response, 'duplicate the Mythos Creature')
  }

  return mythosCreatureSchema.parse(await response.json())
}

/** Calls DELETE .../mythos-creatures/{mythosCreatureId}. */
export async function deleteMythosCreature(accessToken: string, campaignId: string, mythosCreatureId: string): Promise<void> {
  const response = await fetch(`${mythosCreaturesUrl(campaignId)}/${mythosCreatureId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    throw new NonPlayerEntityNotFoundError()
  }
  if (response.status === 409) {
    throw new NonPlayerEntityInUseError()
  }
  if (!response.ok) {
    throw new Error(`Failed to delete the Mythos Creature (${response.status})`)
  }
}
