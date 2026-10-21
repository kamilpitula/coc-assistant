import { afterEach, describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityNotFoundError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { HumanNpcInput } from '@/scenario-preparation/types/HumanNpc'

import { createHumanNpc, deleteHumanNpc, duplicateHumanNpc, editHumanNpc, getHumanNpc } from './humanNpcApi'
import { NonPlayerEntityValidationError } from './nonPlayerEntityApi'

const details = {
  professionOrRole: 'Landlord',
  shortDescription: null,
  goal: null,
  relationshipToInvestigators: null,
  knowledge: null,
  secrets: null,
  behaviorCue: null,
}

const narrative = { id: 'h1', name: 'Mr. Knott', age: 62, details, keeperNotes: null, characteristics: null, skills: null, combat: null, spells: null }

const full = {
  ...narrative,
  characteristics: {
    values: { STR: 70, CON: null },
    difficulty: { STR: 'Hard' },
    derived: { hitPoints: 12, magicPoints: 10, damageBonus: '+1D4', build: 1, movementRate: null, movementRateNotCovered: true },
  },
  skills: [{ name: 'Spot Hidden', specialization: null, value: 55, difficulty: 'Hard' }],
  combat: {
    dodge: 40,
    dodgeDifficulty: 'Regular',
    armorPoints: 1,
    tacticsAndMorale: null,
    weapons: [
      { name: 'Revolver', skill: { name: 'Firearms', specialization: 'Handgun' }, damage: '1D10', attacksPerRound: 1, range: null, ammunition: null, malfunction: null, impaling: false },
    ],
  },
  spells: [{ name: 'Contact Deity', magicPointCost: '5', effect: null }],
}

const respond = (status: number, body?: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status }))

const input: HumanNpcInput = { name: 'Mr. Knott', age: 62, details, keeperNotes: null, characteristics: null, skills: null, combat: null, spells: null }

describe('humanNpcApi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reads a narrative-only and a full Human NPC', async () => {
    respond(200, narrative)
    expect((await getHumanNpc('t', 'c1', 'h1'))?.skills).toBeNull()

    respond(200, full)
    const human = await getHumanNpc('t', 'c1', 'h1')
    expect(human?.characteristics?.derived.movementRateNotCovered).toBe(true)
    expect(human?.skills?.[0].difficulty).toBe('Hard')
  })

  it('resolves null on 404 and rejects a response with an unknown field', async () => {
    respond(404)
    expect(await getHumanNpc('t', 'c1', 'h1')).toBeNull()

    respond(200, { ...narrative, derivedValues: {} })
    await expect(getHumanNpc('t', 'c1', 'h1')).rejects.toThrow()
  })

  it('posts only the name and age when creating', async () => {
    const fetchSpy = respond(201, narrative)

    await createHumanNpc('t', 'c1', 'Mr. Knott', 62)

    expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/c1/human-npcs', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Mr. Knott', age: 62 }) }))
  })

  it('maps a 400 to the refused values by lower-cased path and a 404 to not found', async () => {
    respond(400, { errors: { 'Combat.Weapons[0].Damage': ['Enter the damage.'] } })
    const error = await editHumanNpc('t', 'c1', 'h1', input).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(NonPlayerEntityValidationError)
    expect((error as NonPlayerEntityValidationError).problems).toEqual([{ path: 'combat.weapons[0].damage', messages: ['Enter the damage.'] }])

    respond(404)
    await expect(editHumanNpc('t', 'c1', 'h1', input)).rejects.toBeInstanceOf(NonPlayerEntityNotFoundError)
    respond(500)
    await expect(createHumanNpc('t', 'c1', 'x', 1)).rejects.toThrow('500')
  })

  it('sends the whole profile with PUT', async () => {
    const fetchSpy = respond(200, narrative)

    await editHumanNpc('t', 'c1', 'h1', input)

    expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/c1/human-npcs/h1', expect.objectContaining({ method: 'PUT', body: JSON.stringify(input) }))
  })

  it('deletes, and reports 404 and other failures', async () => {
    respond(204)
    await expect(deleteHumanNpc('t', 'c1', 'h1')).resolves.toBeUndefined()
    respond(404)
    await expect(deleteHumanNpc('t', 'c1', 'h1')).rejects.toBeInstanceOf(NonPlayerEntityNotFoundError)
    respond(500)
    await expect(deleteHumanNpc('t', 'c1', 'h1')).rejects.toThrow('500')
  })

  it('posts to the duplicate route with no body and reads the copy', async () => {
    const fetchSpy = respond(201, { ...full, id: 'h2', name: 'Mr. Knott (copy)' })

    const copy = await duplicateHumanNpc('t', 'c1', 'h1')

    expect(copy.id).toBe('h2')
    expect(copy.skills?.[0].difficulty).toBe('Hard')
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/campaigns/c1/human-npcs/h1/duplicate')
    expect(init).toEqual(expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer t' }) }))
    expect(init).not.toHaveProperty('body')
  })

  it('maps a duplicate 404 to not found and other failures to a plain error', async () => {
    respond(404)
    await expect(duplicateHumanNpc('t', 'c1', 'h1')).rejects.toBeInstanceOf(NonPlayerEntityNotFoundError)
    respond(500)
    await expect(duplicateHumanNpc('t', 'c1', 'h1')).rejects.toThrow('500')
  })
})
