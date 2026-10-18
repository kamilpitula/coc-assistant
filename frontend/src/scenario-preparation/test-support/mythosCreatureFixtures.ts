import type { MonsterDetails, MythosCreature } from '@/scenario-preparation/types/MythosCreature'

/** Mythos Creatures for stories and tests (specs/scenario-preparation/spec.md scenarios "Ghoul"). */
export const STORY_MYTHOS_CREATURE_ID = 'story-mythos-creature'

export const emptyMonsterDetails: MonsterDetails = {
  creatureKind: null,
  descriptionAndSensoryCues: null,
  origin: null,
  goalAndBehavior: null,
  signsAndTraces: null,
  defeatOutcome: null,
  specimenRangeNotes: null,
}

/** A Mythos Creature with only a name: no sections, no Creature Kind. */
export const bareMythosCreature: MythosCreature = {
  id: STORY_MYTHOS_CREATURE_ID,
  name: 'Ghoul',
  details: emptyMonsterDetails,
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

/** The narrative-only Ghoul with a Creature Kind. */
export const narrativeGhoul: MythosCreature = {
  ...bareMythosCreature,
  details: { ...emptyMonsterDetails, creatureKind: 'Mythos', origin: 'Crypts under Arkham', defeatOutcome: 'Flees into the tunnels.' },
}

/** The Ghoul: STR 80, CON 60, SIZ 60, DEX 60, INT 60, POW 60, with worked-out values and difficulty. */
export const ghoulMythosCreature: MythosCreature = {
  ...narrativeGhoul,
  characteristics: {
    values: { STR: 80, CON: 60, SIZ: 60, DEX: 60, INT: 60, POW: 60, APP: null, EDU: null },
    hitPointsNotApplicable: false,
    overrides: { hitPoints: null, magicPoints: null, damageBonus: null, build: null },
    difficulty: { STR: 'Hard', CON: 'Hard', SIZ: 'Hard', DEX: 'Hard', INT: 'Hard', POW: 'Hard' },
    derived: { hitPoints: 12, magicPoints: 12, damageBonus: '+1D4', build: 1 },
  },
  movement: [
    { mode: 'Walk', label: null, rate: 8 },
    { mode: 'Other', label: 'phasing', rate: 10 },
  ],
  combat: {
    attacksPerRound: 3,
    dodge: 30,
    dodgeDifficulty: 'Regular',
    attacks: [
      { name: 'Claw', skill: 'Fighting', skillValue: 40, difficulty: 'Regular', damage: '1D6+DB', effect: 'Grapples on a hit.', manoeuvre: false },
      { name: 'Drag down', skill: 'Fighting', skillValue: 50, difficulty: 'Hard', damage: null, effect: null, manoeuvre: true },
    ],
  },
  defenses: {
    armorPoints: 0,
    armorNote: null,
    immunities: [{ description: 'Ordinary bullets inflict no damage.' }],
    vulnerabilities: [{ description: 'Fire' }],
  },
  skills: [{ name: 'Stealth', value: 70, difficulty: 'Hard' }],
  spells: [{ name: 'Contact Deity', magicPointCost: '5', effect: 'Summons a god.' }],
  powers: [{ name: 'Drain', magicPointCost: '1', effect: 'Drains Magic Points.', limits: 'Once per day' }],
  sanityLoss: { value: '0/1D6' },
}

/** The Ghoul with an overridden Hit Points value and a Damage Bonus override whose computed value cannot be worked out. */
export const overriddenGhoul: MythosCreature = {
  ...ghoulMythosCreature,
  characteristics: {
    ...ghoulMythosCreature.characteristics!,
    values: { STR: 80, CON: 60, SIZ: null, DEX: null, INT: null, POW: null, APP: null, EDU: null },
    overrides: {
      hitPoints: { value: 40, reason: 'Swollen with stolen life' },
      magicPoints: { value: 5, reason: 'Drained' },
      damageBonus: { value: '+2D6', reason: 'Strong' },
      build: { value: 3, reason: 'Hulking' },
    },
    difficulty: { STR: 'Hard', CON: 'Hard' },
    derived: { hitPoints: null, magicPoints: null, damageBonus: null, build: null },
  },
}

/** The Ghoul whose Hit Points are not applicable because it dissolves. */
export const dissolvingGhoul: MythosCreature = {
  ...ghoulMythosCreature,
  details: { ...ghoulMythosCreature.details, defeatOutcome: 'It dissolves into black water at dawn.' },
  characteristics: { ...ghoulMythosCreature.characteristics!, hitPointsNotApplicable: true },
}
