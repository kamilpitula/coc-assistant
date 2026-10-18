import { afterEach, describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityNotFoundError, NonPlayerEntityValidationError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { MythosCreatureInput } from '@/scenario-preparation/types/MythosCreature'

import { createMythosCreature, deleteMythosCreature, editMythosCreature, getMythosCreature } from './mythosCreatureApi'

const details = {
  creatureKind: 'Mythos',
  descriptionAndSensoryCues: null,
  origin: null,
  goalAndBehavior: null,
  signsAndTraces: null,
  defeatOutcome: null,
  specimenRangeNotes: null,
}

const empty = {
  id: 'm1',
  name: 'Ghoul',
  details: { ...details, creatureKind: null },
  keeperNotes: null,
  characteristics: null,
  movement: null,
  combat: null,
  defenses: null,
  skills: null,
  spells: null,
  powers: null,
  sanityLoss: null,
}

const full = {
  ...empty,
  details,
  characteristics: {
    values: { STR: 80, CON: null },
    hitPointsNotApplicable: false,
    overrides: { hitPoints: { value: 40, reason: 'Swollen' }, magicPoints: null, damageBonus: { value: '+2D6', reason: 'Strong' }, build: null },
    difficulty: { STR: 'Hard' },
    derived: { hitPoints: 12, magicPoints: null, damageBonus: '+1D4', build: 1 },
  },
  movement: [{ mode: 'Walk', label: null, rate: 8 }],
  combat: {
    attacksPerRound: 3,
    dodge: 40,
    dodgeDifficulty: 'Regular',
    attacks: [{ name: 'Claw', skill: 'Fighting', skillValue: 40, difficulty: 'Regular', damage: '1D6+DB', effect: null, manoeuvre: false }],
  },
  defenses: { armorPoints: 0, armorNote: null, immunities: [{ description: 'Bullets' }], vulnerabilities: [] },
  skills: [{ name: 'Stealth', value: 55, difficulty: 'Hard' }],
  spells: [{ name: 'Contact Deity', magicPointCost: '5', effect: null }],
  powers: [{ name: 'Drain', magicPointCost: null, effect: null, limits: 'Once per day' }],
  sanityLoss: { value: '0/1D6' },
}

const respond = (status: number, body?: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status }))

const input: MythosCreatureInput = {
  name: 'Ghoul',
  details: { ...details, creatureKind: 'Mythos' },
  keeperNotes: null,
  characteristics: null,
  movement: null,
  combat: null,
  defenses: null,
  skills: null,
  spells: null,
  powers: null,
  sanityLoss: null,
}

describe('mythosCreatureApi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reads an empty and a full Mythos Creature with its overrides, difficulty, and derived values', async () => {
    respond(200, empty)
    expect((await getMythosCreature('t', 'c1', 'm1'))?.combat).toBeNull()

    respond(200, full)
    const creature = await getMythosCreature('t', 'c1', 'm1')
    expect(creature?.characteristics?.overrides.hitPoints).toEqual({ value: 40, reason: 'Swollen' })
    expect(creature?.characteristics?.derived.build).toBe(1)
    expect(creature?.combat?.attacks[0].difficulty).toBe('Regular')
    expect(creature?.powers?.[0].limits).toBe('Once per day')
  })

  it('resolves null on 404 and rejects an unknown field, an unknown Creature Kind, or MOV', async () => {
    respond(404)
    expect(await getMythosCreature('t', 'c1', 'm1')).toBeNull()

    respond(200, { ...empty, derivedValues: {} })
    await expect(getMythosCreature('t', 'c1', 'm1')).rejects.toThrow()

    respond(200, { ...empty, details: { ...details, creatureKind: 'Dragon' } })
    await expect(getMythosCreature('t', 'c1', 'm1')).rejects.toThrow()

    respond(200, { ...full, characteristics: { ...full.characteristics, derived: { ...full.characteristics.derived, movementRate: 8 } } })
    await expect(getMythosCreature('t', 'c1', 'm1')).rejects.toThrow()
  })

  it('posts only the name when creating', async () => {
    const fetchSpy = respond(201, empty)

    await createMythosCreature('t', 'c1', 'Ghoul')

    expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/c1/mythos-creatures', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Ghoul' }) }))
  })

  it('maps a 400 to the refused values by lower-cased path and a 404 to not found', async () => {
    respond(400, { errors: { 'Characteristics.Overrides.HitPoints.Reason': ['Give a reason for the override.'] } })
    const error = await editMythosCreature('t', 'c1', 'm1', input).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(NonPlayerEntityValidationError)
    expect((error as NonPlayerEntityValidationError).problems).toEqual([
      { path: 'characteristics.overrides.hitpoints.reason', messages: ['Give a reason for the override.'] },
    ])

    respond(404)
    await expect(editMythosCreature('t', 'c1', 'm1', input)).rejects.toBeInstanceOf(NonPlayerEntityNotFoundError)
    respond(404)
    await expect(createMythosCreature('t', 'c1', 'Ghoul')).rejects.toBeInstanceOf(NonPlayerEntityNotFoundError)
  })

  it('puts the whole profile when editing and rejects other failures with a plain error', async () => {
    const fetchSpy = respond(200, full)
    await editMythosCreature('t', 'c1', 'm1', input)
    expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/c1/mythos-creatures/m1', expect.objectContaining({ method: 'PUT', body: JSON.stringify(input) }))

    respond(500)
    await expect(editMythosCreature('t', 'c1', 'm1', input)).rejects.toThrow('Failed to save the Mythos Creature (500)')
  })

  it('deletes, and maps 404 to not found', async () => {
    const fetchSpy = respond(204)
    await deleteMythosCreature('t', 'c1', 'm1')
    expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/c1/mythos-creatures/m1', expect.objectContaining({ method: 'DELETE' }))

    respond(404)
    await expect(deleteMythosCreature('t', 'c1', 'm1')).rejects.toBeInstanceOf(NonPlayerEntityNotFoundError)
    respond(500)
    await expect(deleteMythosCreature('t', 'c1', 'm1')).rejects.toThrow('Failed to delete the Mythos Creature (500)')
  })
})
