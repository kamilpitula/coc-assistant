import { describe, expect, it } from 'vitest'

import {
  bareMythosCreature,
  dissolvingGhoul,
  ghoulMythosCreature,
  narrativeGhoul,
  overriddenGhoul,
} from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import type { MythosCreature } from '@/scenario-preparation/types/MythosCreature'

import {
  fieldPaths,
  identityErrors,
  inputFromState,
  mythosCreatureFormReducer,
  presentSections,
  sectionHasValues,
  stateFromMythosCreature,
  summaryProblems,
  type MythosCreatureFormAction,
  type MythosCreatureFormState,
} from './mythosCreatureForm'
import { SECTION_ORDER, type SectionName } from './mythosCreatureSections'
import { addRowButtonId, addSectionButtonId, controlIdFor, MAX_ROWS } from './profileForm'

// specs/scenario-preparation/ux.md sections 25.2 and 25.5; SP-UX-33, SP-UX-34, SP-UX-35, SP-UX-45, SP-UX-46, SP-UX-49, SP-A11Y-22.

const start = (creature: MythosCreature = bareMythosCreature) => stateFromMythosCreature(creature)

function reduce(state: MythosCreatureFormState, ...actions: MythosCreatureFormAction[]): MythosCreatureFormState {
  return actions.reduce(mythosCreatureFormReducer, state)
}

describe('stateFromMythosCreature and inputFromState', () => {
  it('turns a bare Mythos Creature into a name-only request with every section null', () => {
    const input = inputFromState(start(), null)

    expect(input).toEqual({
      name: 'Ghoul',
      details: { creatureKind: null, descriptionAndSensoryCues: null, origin: null, goalAndBehavior: null, signsAndTraces: null, defeatOutcome: null, specimenRangeNotes: null },
      keeperNotes: null,
      characteristics: null,
      movement: null,
      combat: null,
      defenses: null,
      skills: null,
      spells: null,
      powers: null,
      sanityLoss: null,
    })
  })

  it('round trips a full profile without sending difficulty, derived values, or computed anything', () => {
    const input = inputFromState(start(ghoulMythosCreature), null)

    expect(input.details.creatureKind).toBe('Mythos')
    expect(input.characteristics).toEqual({
      values: { STR: 80, CON: 60, SIZ: 60, DEX: 60, INT: 60, POW: 60, APP: null, EDU: null },
      hitPointsNotApplicable: false,
      overrides: { hitPoints: null, magicPoints: null, damageBonus: null, build: null },
    })
    expect(input.movement).toEqual([
      { mode: 'Walk', label: null, rate: 8 },
      { mode: 'Other', label: 'phasing', rate: 10 },
    ])
    expect(input.combat?.attacks[1]).toEqual({ name: 'Drag down', skill: 'Fighting', skillValue: 50, damage: null, effect: null, manoeuvre: true })
    expect(input.defenses).toEqual({
      armorPoints: 0,
      armorNote: null,
      immunities: [{ description: 'Ordinary bullets inflict no damage.' }],
      vulnerabilities: [{ description: 'Fire' }],
    })
    expect(input.skills).toEqual([{ name: 'Stealth', value: 70 }])
    expect(input.powers).toEqual([{ name: 'Drain', magicPointCost: '1', effect: 'Drains Magic Points.', limits: 'Once per day' }])
    expect(input.sanityLoss).toEqual({ value: '0/1D6' })
    expect(JSON.stringify(input)).not.toMatch(/difficulty|derived/i)
  })

  it('keeps overrides with their reasons and shows Override when Hit Points have one', () => {
    const state = start(overriddenGhoul)

    expect(state.characteristics?.hitPointsMode).toBe('override')
    expect(inputFromState(state, null).characteristics?.overrides).toEqual({
      hitPoints: { value: 40, reason: 'Swollen with stolen life' },
      magicPoints: { value: 5, reason: 'Drained' },
      damageBonus: { value: '+2D6', reason: 'Strong' },
      build: { value: 3, reason: 'Hulking' },
    })
  })

  it('reads Hit Points not applicable as its own choice and sends the flag', () => {
    const state = start(dissolvingGhoul)

    expect(state.characteristics?.hitPointsMode).toBe('notApplicable')
    expect(inputFromState(state, null).characteristics).toMatchObject({ hitPointsNotApplicable: true })
    expect(inputFromState(state, null).characteristics?.overrides.hitPoints).toBeNull()
  })

  it('turns blank text into null and drops the label of a mode that is not Other', () => {
    const state = reduce(
      start(),
      { type: 'addSection', section: 'movement' },
      { type: 'addMovement' },
      { type: 'setMovementMode', index: 0, mode: 'Other' },
      { type: 'setMovementLabel', index: 0, value: 'phasing' },
      { type: 'setMovementRate', index: 0, value: 4 },
      { type: 'setMovementMode', index: 0, mode: 'Fly' },
      { type: 'addSection', section: 'sanityLoss' },
    )

    const input = inputFromState(state, null)

    expect(input.movement).toEqual([{ mode: 'Fly', label: null, rate: 4 }])
    expect(input.sanityLoss).toEqual({ value: null })
  })

  it('keeps the Keeper notes it is given', () => {
    const notes = { root: { type: 'root' as const, children: [] } }

    expect(inputFromState(start(), notes).keeperNotes).toBe(notes)
  })
})

describe('Name check', () => {
  it('asks for a name and refuses one over 200 characters', () => {
    expect(identityErrors({ ...start(), name: '  ' })).toEqual({ name: 'Enter a name.' })
    expect(identityErrors({ ...start(), name: 'x'.repeat(201) })).toEqual({ name: 'Name must be 200 characters or fewer.' })
    expect(identityErrors(start())).toEqual({})
  })
})

describe('details', () => {
  it('sets the name, the Creature Kind (or Not set), and each narrative field', () => {
    const state = reduce(
      start(),
      { type: 'setName', value: 'Elder Ghoul' },
      { type: 'setCreatureKind', value: 'Beast' },
      { type: 'setDetail', key: 'origin', value: 'Crypts' },
    )

    expect(inputFromState(state, null)).toMatchObject({ name: 'Elder Ghoul', details: { creatureKind: 'Beast', origin: 'Crypts' } })
    expect(inputFromState(reduce(state, { type: 'setCreatureKind', value: null }), null).details.creatureKind).toBeNull()
  })
})

describe('sections', () => {
  it('adds each section empty, announces it, and focuses its first control (SP-UX-33, SP-A11Y-22)', () => {
    const focus = (section: SectionName) => reduce(start(), { type: 'addSection', section }).focusTarget

    expect(focus('characteristics')).toBe(controlIdFor('characteristics.values.STR'))
    expect(focus('movement')).toBe(addRowButtonId('movement'))
    expect(focus('combat')).toBe(controlIdFor('combat.attacksPerRound'))
    expect(focus('defenses')).toBe(controlIdFor('defenses.armorPoints'))
    expect(focus('skills')).toBe(addRowButtonId('skills'))
    expect(focus('spells')).toBe(addRowButtonId('spells'))
    expect(focus('powers')).toBe(addRowButtonId('powers'))
    expect(focus('sanityLoss')).toBe(controlIdFor('sanityLoss.value'))
    expect(reduce(start(), { type: 'addSection', section: 'sanityLoss' }).announcement).toBe('Sanity loss section added.')
  })

  it('removes a section, focuses its Add button, and announces it', () => {
    const state = reduce(start(ghoulMythosCreature), { type: 'removeSection', section: 'combat' })

    expect(state.combat).toBeNull()
    expect(state.focusTarget).toBe(addSectionButtonId('combat'))
    expect(state.announcement).toBe('Combat section removed.')
  })

  it('lists the present sections in the fixed order whatever order they were added in (SP-UX-45)', () => {
    const state = reduce(start(), { type: 'addSection', section: 'sanityLoss' }, { type: 'addSection', section: 'characteristics' }, { type: 'addSection', section: 'defenses' })

    expect(presentSections(state)).toEqual(['characteristics', 'defenses', 'sanityLoss'])
    expect(presentSections(reduce(state, { type: 'removeSection', section: 'defenses' }))).toEqual(['characteristics', 'sanityLoss'])
  })

  it('knows when a section holds a value, so removing it asks first', () => {
    const empty = reduce(
      start(),
      { type: 'addSection', section: 'characteristics' },
      { type: 'addSection', section: 'combat' },
      { type: 'addSection', section: 'defenses' },
      { type: 'addSection', section: 'sanityLoss' },
      { type: 'addSection', section: 'skills' },
    )
    expect((['characteristics', 'combat', 'defenses', 'sanityLoss', 'skills'] as SectionName[]).map((section) => sectionHasValues(empty, section))).toEqual([false, false, false, false, false])

    const filled = start(ghoulMythosCreature)
    expect(SECTION_ORDER.map((section) => sectionHasValues(filled, section))).toEqual(
      [true, true, true, true, true, true, true, true],
    )
    expect(sectionHasValues(reduce(empty, { type: 'setHitPointsMode', mode: 'notApplicable' }), 'characteristics')).toBe(true)
    expect(sectionHasValues(reduce(empty, { type: 'setOverrideEnabled', override: 'build', enabled: true }), 'characteristics')).toBe(true)
  })
})

describe('characteristics, APP and EDU, and overrides', () => {
  const withCharacteristics = () => reduce(start(), { type: 'addSection', section: 'characteristics' })

  it('sets one characteristic', () => {
    const state = reduce(withCharacteristics(), { type: 'setCharacteristic', code: 'STR', value: 90 })

    expect(state.characteristics?.values.STR).toBe(90)
  })

  it('shows APP and EDU only after Add APP or Add EDU, or when they have a value (SP-UX-49)', () => {
    expect(withCharacteristics().characteristics?.extraShown).toEqual({ APP: false, EDU: false })

    const added = reduce(withCharacteristics(), { type: 'showCharacteristic', code: 'APP' })
    expect(added.characteristics?.extraShown).toEqual({ APP: true, EDU: false })
    expect(added.focusTarget).toBe(controlIdFor('characteristics.values.APP'))

    const saved = start({ ...ghoulMythosCreature, characteristics: { ...ghoulMythosCreature.characteristics!, values: { ...ghoulMythosCreature.characteristics!.values, EDU: 70 } } })
    expect(saved.characteristics?.extraShown).toEqual({ APP: false, EDU: true })
  })

  it('Hit Points offer computed, Override, or Not applicable; choosing another drops the override (SP-UX-46)', () => {
    const overriding = reduce(
      withCharacteristics(),
      { type: 'setHitPointsMode', mode: 'override' },
      { type: 'setOverrideNumber', override: 'hitPoints', value: 25 },
      { type: 'setOverrideReason', override: 'hitPoints', value: 'Swollen' },
    )
    expect(inputFromState(overriding, null).characteristics?.overrides.hitPoints).toEqual({ value: 25, reason: 'Swollen' })

    const switched = reduce(overriding, { type: 'setHitPointsMode', mode: 'notApplicable' })
    expect(inputFromState(switched, null).characteristics).toMatchObject({ hitPointsNotApplicable: true })
    expect(inputFromState(switched, null).characteristics?.overrides.hitPoints).toBeNull()

    const back = reduce(switched, { type: 'setHitPointsMode', mode: 'override' })
    expect(back.characteristics?.hitPoints).toEqual({ value: null, reason: '' })
  })

  it('choosing Override focuses its value field', () => {
    expect(reduce(withCharacteristics(), { type: 'setHitPointsMode', mode: 'override' }).focusTarget).toBe(controlIdFor('characteristics.overrides.hitPoints.value'))
  })

  it('Override checkboxes reveal value and reason fields and clearing one drops its values (SP-UX-46)', () => {
    const on = reduce(
      withCharacteristics(),
      { type: 'setOverrideEnabled', override: 'magicPoints', enabled: true },
      { type: 'setOverrideNumber', override: 'magicPoints', value: 9 },
      { type: 'setOverrideReason', override: 'magicPoints', value: 'Drained' },
      { type: 'setOverrideEnabled', override: 'damageBonus', enabled: true },
      { type: 'setDamageBonusOverride', value: '+1D4' },
      { type: 'setOverrideReason', override: 'damageBonus', value: 'Strong' },
      { type: 'setOverrideEnabled', override: 'build', enabled: true },
      { type: 'setOverrideNumber', override: 'build', value: -1 },
      { type: 'setOverrideReason', override: 'build', value: 'Hunched' },
    )
    expect(inputFromState(on, null).characteristics?.overrides).toEqual({
      hitPoints: null,
      magicPoints: { value: 9, reason: 'Drained' },
      damageBonus: { value: '+1D4', reason: 'Strong' },
      build: { value: -1, reason: 'Hunched' },
    })

    const off = reduce(on, { type: 'setOverrideEnabled', override: 'magicPoints', enabled: false }, { type: 'setOverrideEnabled', override: 'damageBonus', enabled: false })
    expect(inputFromState(off, null).characteristics?.overrides).toMatchObject({ magicPoints: null, damageBonus: null, build: { value: -1, reason: 'Hunched' } })
  })

  it('turning an override on moves focus to its value field', () => {
    const state = reduce(withCharacteristics(), { type: 'setOverrideEnabled', override: 'damageBonus', enabled: true })

    expect(state.focusTarget).toBe(controlIdFor('characteristics.overrides.damageBonus.value'))
  })

  it('ignores characteristic changes while the section is removed', () => {
    const state = start()

    expect(reduce(state, { type: 'setCharacteristic', code: 'STR', value: 10 })).toEqual(state)
    expect(reduce(state, { type: 'setHitPointsMode', mode: 'override' })).toEqual(state)
    expect(reduce(state, { type: 'setOverrideEnabled', override: 'build', enabled: true })).toEqual(state)
    expect(reduce(state, { type: 'showCharacteristic', code: 'EDU' })).toEqual(state)
  })
})

describe('repeating rows', () => {
  it('adds a movement mode starting at Walk and focuses its first field, then removes with the focus rules (SP-UX-34)', () => {
    const one = reduce(start(), { type: 'addSection', section: 'movement' }, { type: 'addMovement' })
    expect(one.movement).toEqual([expect.objectContaining({ mode: 'Walk', label: '', rate: null })])
    expect(one.focusTarget).toBe(controlIdFor('movement[0].mode'))

    const three = reduce(one, { type: 'addMovement' }, { type: 'addMovement' })
    expect(reduce(three, { type: 'removeMovement', index: 0 }).focusTarget).toBe(controlIdFor('movement[0].mode'))
    expect(reduce(three, { type: 'removeMovement', index: 2 }).focusTarget).toBe(controlIdFor('movement[1].mode'))
    expect(reduce(one, { type: 'removeMovement', index: 0 }).focusTarget).toBe(addRowButtonId('movement'))
  })

  it('adds an attack prefilled with Fighting, edits it, and focuses by the same rules', () => {
    const state = reduce(
      start(),
      { type: 'addSection', section: 'combat' },
      { type: 'addAttack' },
      { type: 'setAttackText', index: 0, field: 'name', value: 'Claw' },
      { type: 'setAttackText', index: 0, field: 'damage', value: '1D6+DB' },
      { type: 'setAttackText', index: 0, field: 'effect', value: 'Grapples' },
      { type: 'setAttackValue', index: 0, value: 40 },
      { type: 'setAttackManoeuvre', index: 0, value: true },
      { type: 'setAttacksPerRound', value: 3 },
      { type: 'setDodge', value: 25 },
    )

    expect(state.combat?.attacks[0]).toMatchObject({ name: 'Claw', skill: 'Fighting', skillValue: 40, damage: '1D6+DB', effect: 'Grapples', manoeuvre: true })
    expect(inputFromState(state, null).combat).toMatchObject({ attacksPerRound: 3, dodge: 25 })
    expect(reduce(state, { type: 'addAttack' }).focusTarget).toBe(controlIdFor('combat.attacks[1].name'))
    expect(reduce(state, { type: 'removeAttack', index: 0 }).focusTarget).toBe(addRowButtonId('combat.attacks'))
  })

  it('edits armor and adds and removes immunities and vulnerabilities', () => {
    const state = reduce(
      start(),
      { type: 'addSection', section: 'defenses' },
      { type: 'setArmorPoints', value: 2 },
      { type: 'setArmorNote', value: 'Hide' },
      { type: 'addDefenseEntry', list: 'immunities' },
      { type: 'setDefenseEntry', list: 'immunities', index: 0, value: 'Bullets' },
      { type: 'addDefenseEntry', list: 'vulnerabilities' },
      { type: 'setDefenseEntry', list: 'vulnerabilities', index: 0, value: 'Fire' },
    )

    expect(inputFromState(state, null).defenses).toEqual({
      armorPoints: 2,
      armorNote: 'Hide',
      immunities: [{ description: 'Bullets' }],
      vulnerabilities: [{ description: 'Fire' }],
    })
    expect(reduce(state, { type: 'addDefenseEntry', list: 'immunities' }).focusTarget).toBe(controlIdFor('defenses.immunities[1].description'))
    expect(reduce(state, { type: 'removeDefenseEntry', list: 'vulnerabilities', index: 0 }).focusTarget).toBe(addRowButtonId('defenses.vulnerabilities'))
    expect(reduce(state, { type: 'removeDefenseEntry', list: 'immunities', index: 0 }).defenses?.immunities).toEqual([])
  })

  it('adds, edits, and removes skills, spells, and powers', () => {
    const state = reduce(
      start(),
      { type: 'addSection', section: 'skills' },
      { type: 'addSkill' },
      { type: 'setSkillName', index: 0, value: 'Stealth' },
      { type: 'setSkillValue', index: 0, value: 70 },
      { type: 'addSection', section: 'spells' },
      { type: 'addSpell' },
      { type: 'setSpellText', index: 0, field: 'name', value: 'Contact Deity' },
      { type: 'setSpellText', index: 0, field: 'magicPointCost', value: '5' },
      { type: 'setSpellText', index: 0, field: 'effect', value: 'Summons' },
      { type: 'addSection', section: 'powers' },
      { type: 'addPower' },
      { type: 'setPowerText', index: 0, field: 'name', value: 'Drain' },
      { type: 'setPowerText', index: 0, field: 'limits', value: 'Once per day' },
      { type: 'addSection', section: 'sanityLoss' },
      { type: 'setSanityLoss', value: '1/1D10' },
    )

    const input = inputFromState(state, null)
    expect(input.skills).toEqual([{ name: 'Stealth', value: 70 }])
    expect(input.spells).toEqual([{ name: 'Contact Deity', magicPointCost: '5', effect: 'Summons' }])
    expect(input.powers).toEqual([{ name: 'Drain', magicPointCost: null, effect: null, limits: 'Once per day' }])
    expect(input.sanityLoss).toEqual({ value: '1/1D10' })
    expect(reduce(state, { type: 'removeSkill', index: 0 }).focusTarget).toBe(addRowButtonId('skills'))
    expect(reduce(state, { type: 'removeSpell', index: 0 }).focusTarget).toBe(addRowButtonId('spells'))
    expect(reduce(state, { type: 'removePower', index: 0 }).focusTarget).toBe(addRowButtonId('powers'))
  })

  it('stops adding at 100 rows in each list (SP-UX-34)', () => {
    const many = (type: 'addMovement' | 'addAttack' | 'addSkill' | 'addSpell' | 'addPower') =>
      Array.from({ length: MAX_ROWS + 5 }, () => ({ type }) as const)
    const state = reduce(
      start(),
      { type: 'addSection', section: 'movement' },
      ...many('addMovement'),
      { type: 'addSection', section: 'combat' },
      ...many('addAttack'),
      { type: 'addSection', section: 'defenses' },
      ...Array.from({ length: MAX_ROWS + 5 }, () => ({ type: 'addDefenseEntry', list: 'immunities' }) as const),
      ...Array.from({ length: MAX_ROWS + 5 }, () => ({ type: 'addDefenseEntry', list: 'vulnerabilities' }) as const),
      { type: 'addSection', section: 'skills' },
      ...many('addSkill'),
      { type: 'addSection', section: 'spells' },
      ...many('addSpell'),
      { type: 'addSection', section: 'powers' },
      ...many('addPower'),
    )

    expect([
      state.movement?.length,
      state.combat?.attacks.length,
      state.defenses?.immunities.length,
      state.defenses?.vulnerabilities.length,
      state.skills?.length,
      state.spells?.length,
      state.powers?.length,
    ]).toEqual([MAX_ROWS, MAX_ROWS, MAX_ROWS, MAX_ROWS, MAX_ROWS, MAX_ROWS, MAX_ROWS])
  })

  it('does nothing to a list or field of a section that is not added', () => {
    const state = start()
    const actions: MythosCreatureFormAction[] = [
      { type: 'addMovement' },
      { type: 'setMovementRate', index: 0, value: 1 },
      { type: 'addAttack' },
      { type: 'setDodge', value: 1 },
      { type: 'setAttackValue', index: 0, value: 1 },
      { type: 'addDefenseEntry', list: 'immunities' },
      { type: 'setArmorPoints', value: 1 },
      { type: 'addSkill' },
      { type: 'addSpell' },
      { type: 'addPower' },
      { type: 'setSanityLoss', value: '0/1' },
    ]

    actions.forEach((action) => expect(reduce(state, action)).toEqual(state))
  })

  it('clears the focus target once it has been used', () => {
    const state = reduce(start(), { type: 'addSection', section: 'skills' }, { type: 'clearFocus' })

    expect(state.focusTarget).toBeNull()
  })
})

describe('server problems', () => {
  it('lists every request path that has a field on screen, with APP and EDU only when shown', () => {
    const paths = fieldPaths(start(ghoulMythosCreature))

    expect(paths).toEqual(
      expect.arrayContaining([
        'name',
        'details.creatureKind',
        'details.origin',
        'details.defeatOutcome',
        'keeperNotes',
        'characteristics.values.STR',
        'movement[1].label',
        'movement[1].rate',
        'combat.attacksPerRound',
        'combat.attacks[1].skillValue',
        'defenses.immunities[0].description',
        'defenses.vulnerabilities[0].description',
        'skills[0].value',
        'spells[0].effect',
        'powers[0].limits',
        'sanityLoss.value',
      ]),
    )
    expect(paths).not.toContain('characteristics.values.APP')
    expect(paths).not.toContain('movement[0].label')
    expect(fieldPaths(start(overriddenGhoul))).toEqual(
      expect.arrayContaining(['characteristics.overrides.hitPoints.value', 'characteristics.overrides.hitPoints.reason', 'characteristics.overrides.damageBonus.reason']),
    )
    expect(fieldPaths(start(dissolvingGhoul))).toContain('characteristics.hitPointsNotApplicable')
    expect(fieldPaths(start(narrativeGhoul))).not.toContain('characteristics.values.STR')
  })

  it('pairs each message with its field in any letter case and leaves unknown paths unlinked (SP-UX-35)', () => {
    const state = start(ghoulMythosCreature)

    const problems = summaryProblems(state, [
      { path: 'combat.attacks[0].damage', messages: ['Enter the damage, or mark the attack as a manoeuvre.'] },
      { path: 'combat.attacks', messages: ['Add at most 100 attacks.'] },
      { path: 'sanityloss.value', messages: ['Write the Sanity loss as success/failure, for example 0/1D6.'] },
    ])

    expect(problems).toEqual([
      { message: 'Enter the damage, or mark the attack as a manoeuvre.', path: 'combat.attacks[0].damage' },
      { message: 'Add at most 100 attacks.', path: null },
      { message: 'Write the Sanity loss as success/failure, for example 0/1D6.', path: 'sanityLoss.value' },
    ])
  })
})
