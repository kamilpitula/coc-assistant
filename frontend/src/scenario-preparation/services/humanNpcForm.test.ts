import { describe, expect, it } from 'vitest'

import type { HumanNpc } from '@/scenario-preparation/types/HumanNpc'

import {
  fieldPaths,
  humanNpcFormReducer,
  identityErrors,
  inputFromState,
  sectionHasValues,
  stateFromHumanNpc,
  summaryProblems,
  type HumanNpcFormAction,
  type HumanNpcFormState,
} from './humanNpcForm'
import { addRowButtonId, addSectionButtonId, controlIdFor, hasProblemOn, MAX_ROWS, messageFor } from './profileForm'

// specs/scenario-preparation/ux.md section 25; SP-UX-33, SP-UX-34, SP-UX-35, SP-UX-43, SP-A11Y-22.

const details = {
  professionOrRole: 'Landlord',
  shortDescription: null,
  goal: null,
  relationshipToInvestigators: null,
  knowledge: null,
  secrets: null,
  behaviorCue: null,
}

const narrative: HumanNpc = {
  id: 'h1',
  name: 'Mr. Knott',
  age: 62,
  details,
  keeperNotes: null,
  characteristics: null,
  skills: null,
  combat: null,
  spells: null,
}

const full: HumanNpc = {
  ...narrative,
  characteristics: {
    values: { STR: 70, CON: null },
    difficulty: { STR: 'Hard' },
    derived: { hitPoints: 12, magicPoints: 10, damageBonus: '+1D4', build: 1, movementRate: 8, movementRateNotCovered: false },
  },
  skills: [
    { name: 'Spot Hidden', specialization: null, value: 55, difficulty: 'Hard' },
    { name: 'Firearms', specialization: 'Handgun', value: 60, difficulty: 'Hard' },
  ],
  combat: {
    dodge: 40,
    dodgeDifficulty: 'Regular',
    armorPoints: null,
    tacticsAndMorale: '',
    weapons: [
      { name: 'Revolver', skill: { name: 'firearms', specialization: 'handgun' }, damage: '1D10', attacksPerRound: 1, range: null, ammunition: null, malfunction: null, impaling: false },
    ],
  },
  spells: [{ name: 'Contact Deity', magicPointCost: '5', effect: null }],
}

const reduce = (state: HumanNpcFormState, ...actions: HumanNpcFormAction[]) => actions.reduce(humanNpcFormReducer, state)
const start = () => stateFromHumanNpc(narrative)

describe('stateFromHumanNpc and inputFromState', () => {
  it('loads a narrative profile with no sections and blank text as empty strings', () => {
    const state = start()

    expect(state).toMatchObject({ name: 'Mr. Knott', age: 62, characteristics: null, skills: null, combat: null, spells: null })
    expect(state.details.goal).toBe('')
    expect(state.details.professionOrRole).toBe('Landlord')
  })

  it('round-trips a full profile into a request that carries no derived values or difficulty', () => {
    const input = inputFromState(stateFromHumanNpc(full), null)

    expect(input.characteristics?.STR).toBe(70)
    expect(input.characteristics?.APP).toBeNull()
    expect(input.skills).toEqual([
      { name: 'Spot Hidden', specialization: null, value: 55 },
      { name: 'Firearms', specialization: 'Handgun', value: 60 },
    ])
    expect(input.combat?.weapons[0].skill).toEqual({ name: 'Firearms', specialization: 'Handgun' })
    expect(input.combat?.tacticsAndMorale).toBeNull()
    expect(JSON.stringify(input)).not.toMatch(/difficulty|derived|hitPoints/i)
  })

  it('sends null for sections that were not added and blank text', () => {
    const input = inputFromState(reduce(start(), { type: 'setDetail', key: 'goal', value: '  ' }), null)

    expect(input).toMatchObject({ characteristics: null, skills: null, combat: null, spells: null })
    expect(input.details.goal).toBeNull()
  })

  it('makes a weapon follow its skill row when the skill is renamed, and drops it when the row is removed', () => {
    const state = reduce(stateFromHumanNpc(full), { type: 'setSkillText', index: 1, field: 'specialization', value: 'Rifle/Shotgun' })
    expect(inputFromState(state, null).combat?.weapons[0].skill).toEqual({ name: 'Firearms', specialization: 'Rifle/Shotgun' })

    const removed = reduce(state, { type: 'removeSkill', index: 1 })
    expect(inputFromState(removed, null).combat?.weapons[0].skill).toBeNull()
  })
})

describe('sections', () => {
  it('adds a section empty and focuses its first control, announcing it (SP-UX-33, SP-A11Y-22)', () => {
    const state = reduce(start(), { type: 'addSection', section: 'characteristics' })

    expect(Object.values(state.characteristics ?? {})).toEqual(Array(8).fill(null))
    expect(state.focusTarget).toBe(controlIdFor('characteristics.STR'))
    expect(state.announcement).toBe('Characteristics section added.')
    expect(reduce(start(), { type: 'addSection', section: 'combat' }).focusTarget).toBe(controlIdFor('combat.dodge'))
    expect(reduce(start(), { type: 'addSection', section: 'skills' }).focusTarget).toBe(addRowButtonId('skills'))
    expect(reduce(start(), { type: 'addSection', section: 'spells' }).focusTarget).toBe(addRowButtonId('spells'))
  })

  it('removes a section, focuses its Add button, and announces it', () => {
    const state = reduce(stateFromHumanNpc(full), { type: 'removeSection', section: 'combat' })

    expect(state.combat).toBeNull()
    expect(state.focusTarget).toBe(addSectionButtonId('combat'))
    expect(state.announcement).toBe('Combat section removed.')
  })

  it('knows whether a section holds a value, so only then removal asks first', () => {
    expect(sectionHasValues(reduce(start(), { type: 'addSection', section: 'characteristics' }), 'characteristics')).toBe(false)
    expect(sectionHasValues(stateFromHumanNpc(full), 'characteristics')).toBe(true)
    expect(sectionHasValues(reduce(start(), { type: 'addSection', section: 'skills' }), 'skills')).toBe(false)
    expect(sectionHasValues(stateFromHumanNpc(full), 'skills')).toBe(true)
    expect(sectionHasValues(reduce(start(), { type: 'addSection', section: 'combat' }), 'combat')).toBe(false)
    expect(sectionHasValues(reduce(start(), { type: 'addSection', section: 'combat' }, { type: 'setDodge', value: 20 }), 'combat')).toBe(true)
    expect(sectionHasValues(reduce(start(), { type: 'addSection', section: 'spells' }), 'spells')).toBe(false)
    expect(sectionHasValues(stateFromHumanNpc(full), 'spells')).toBe(true)
  })

  it('edits characteristics', () => {
    const state = reduce(start(), { type: 'addSection', section: 'characteristics' }, { type: 'setCharacteristic', code: 'POW', value: 50 })

    expect(state.characteristics?.POW).toBe(50)
  })
})

describe('rows', () => {
  it('adds a skill row with a fresh key and focuses its first field (SP-UX-34)', () => {
    const state = reduce(stateFromHumanNpc(full), { type: 'addSkill' })

    expect(state.skills).toHaveLength(3)
    expect(new Set(state.skills?.map((row) => row.key)).size).toBe(3)
    expect(state.focusTarget).toBe(controlIdFor('skills[2].name'))
  })

  it('stops adding at 100 rows (SP-UX-34)', () => {
    const many = reduce(start(), { type: 'addSection', section: 'skills' }, ...Array.from({ length: MAX_ROWS + 5 }, () => ({ type: 'addSkill' }) as const))

    expect(many.skills).toHaveLength(MAX_ROWS)
  })

  it('after removing a row focuses the next row, else the previous, else the Add button (SP-A11Y-22)', () => {
    const three = reduce(start(), { type: 'addSection', section: 'skills' }, { type: 'addSkill' }, { type: 'addSkill' }, { type: 'addSkill' })

    expect(reduce(three, { type: 'removeSkill', index: 0 }).focusTarget).toBe(controlIdFor('skills[0].name'))
    expect(reduce(three, { type: 'removeSkill', index: 2 }).focusTarget).toBe(controlIdFor('skills[1].name'))
    const none = reduce(three, { type: 'removeSkill', index: 0 }, { type: 'removeSkill', index: 0 }, { type: 'removeSkill', index: 0 })
    expect(none.focusTarget).toBe(addRowButtonId('skills'))
    expect(none.skills).toEqual([])
  })

  it('edits skill rows', () => {
    const state = reduce(
      start(),
      { type: 'addSection', section: 'skills' },
      { type: 'addSkill' },
      { type: 'setSkillText', index: 0, field: 'name', value: 'Spot Hidden' },
      { type: 'setSkillValue', index: 0, value: 55 },
    )

    expect(state.skills?.[0]).toMatchObject({ name: 'Spot Hidden', value: 55 })
  })

  it('adds, edits, and removes weapons and spells', () => {
    const state = reduce(
      stateFromHumanNpc({ ...full, combat: { ...full.combat!, weapons: [] }, spells: [] }),
      { type: 'addWeapon' },
      { type: 'setWeaponText', index: 0, field: 'name', value: 'Knife' },
      { type: 'setWeaponText', index: 0, field: 'damage', value: '1D4+DB' },
      { type: 'setWeaponSkill', index: 0, skillKey: 0 },
      { type: 'setWeaponAttacks', index: 0, value: 2 },
      { type: 'setWeaponImpaling', index: 0, value: true },
      { type: 'addSpell' },
      { type: 'setSpellText', index: 0, field: 'name', value: 'Mesmerize' },
    )

    expect(state.combat?.weapons[0]).toMatchObject({ name: 'Knife', damage: '1D4+DB', skillKey: 0, attacksPerRound: 2, impaling: true })
    expect(state.focusTarget).toBe(controlIdFor('spells[0].name'))
    expect(inputFromState(state, null).combat?.weapons[0].skill).toEqual({ name: 'Spot Hidden', specialization: null })

    const removed = reduce(state, { type: 'removeWeapon', index: 0 }, { type: 'removeSpell', index: 0 })
    expect(removed.combat?.weapons).toEqual([])
    expect(removed.spells).toEqual([])
    expect(removed.focusTarget).toBe(addRowButtonId('spells'))
  })

  it('edits combat fields and clears the focus target once focused', () => {
    const state = reduce(
      stateFromHumanNpc(full),
      { type: 'setDodge', value: 10 },
      { type: 'setArmorPoints', value: 2 },
      { type: 'setTactics', value: 'Flees' },
      { type: 'removeSection', section: 'spells' },
      { type: 'clearFocus' },
    )

    expect(state.combat).toMatchObject({ dodge: 10, armorPoints: 2, tacticsAndMorale: 'Flees' })
    expect(state.focusTarget).toBeNull()
  })

  it('ignores combat edits when the section is not added and weapon adds past the limit', () => {
    expect(reduce(start(), { type: 'setDodge', value: 10 }).combat).toBeNull()
    expect(reduce(start(), { type: 'addWeapon' }).combat).toBeNull()
  })
})

describe('identity', () => {
  it('requires a name and an age from 0 to 150 and nothing else (ux.md section 25.2)', () => {
    expect(identityErrors(reduce(start(), { type: 'setName', value: ' ' }, { type: 'setAge', value: null }))).toEqual({
      name: 'Enter a name.',
      age: 'Enter an age.',
    })
    expect(identityErrors(reduce(start(), { type: 'setAge', value: 151 }))).toEqual({ age: 'Enter an age from 0 to 150, in whole years.' })
    expect(identityErrors(reduce(start(), { type: 'setName', value: 'x'.repeat(201) }))).toEqual({ name: 'Name must be 200 characters or fewer.' })
    expect(identityErrors(reduce(start(), { type: 'setAge', value: 0 }))).toEqual({})
  })
})

describe('server problems', () => {
  const problems = [
    { path: 'characteristics.str', messages: ['Enter STR from 0 to 100.'] },
    { path: 'combat.weapons[0].damage', messages: ['Enter the damage.'] },
    { path: 'skills', messages: ['Add at most 100 skills.'] },
  ]

  it('matches each problem to its field whatever the letter case, listing unmatched ones without a path (SP-UX-35)', () => {
    const state = reduce(stateFromHumanNpc(full))

    expect(summaryProblems(state, problems)).toEqual([
      { message: 'Enter STR from 0 to 100.', path: 'characteristics.STR' },
      { message: 'Enter the damage.', path: 'combat.weapons[0].damage' },
      { message: 'Add at most 100 skills.', path: null },
    ])
  })

  it('finds the message of a field and whether any problem sits on a set of fields (SP-UX-43)', () => {
    expect(messageFor(problems, 'characteristics.STR')).toBe('Enter STR from 0 to 100.')
    expect(messageFor(problems, 'characteristics.CON')).toBeUndefined()
    expect(hasProblemOn(problems, ['combat.weapons[0].range', 'combat.weapons[0].DAMAGE'])).toBe(true)
    expect(hasProblemOn(problems, ['combat.weapons[0].range'])).toBe(false)
  })

  it('lists a field path for every control that is on screen', () => {
    const paths = fieldPaths(stateFromHumanNpc(full))

    expect(paths).toEqual(expect.arrayContaining(['name', 'age', 'details.goal', 'characteristics.EDU', 'skills[1].value', 'combat.weapons[0].malfunction', 'spells[0].effect', 'keeperNotes']))
    expect(fieldPaths(start())).not.toContain('characteristics.STR')
  })
})
