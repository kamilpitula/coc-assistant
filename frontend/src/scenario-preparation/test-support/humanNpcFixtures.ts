import type { HumanNpc } from '@/scenario-preparation/types/HumanNpc'

/** Human NPCs for stories and tests (specs/scenario-preparation/spec.md scenarios "Thug", "Mr. Knott", "Gangster"). */
export const STORY_HUMAN_NPC_ID = 'story-human-npc'

const emptyDetails = {
  professionOrRole: null,
  shortDescription: null,
  goal: null,
  relationshipToInvestigators: null,
  knowledge: null,
  secrets: null,
  behaviorCue: null,
}

/** The narrative-only Mr. Knott of the first scenario. */
export const knottHumanNpc: HumanNpc = {
  id: STORY_HUMAN_NPC_ID,
  name: 'Mr. Knott',
  age: 62,
  details: { ...emptyDetails, professionOrRole: 'Landlord', goal: 'Rent the Corbitt House' },
  keeperNotes: null,
  characteristics: null,
  skills: null,
  combat: null,
  spells: null,
}

/** The Thug: STR 70, CON 60, SIZ 65, DEX 55, POW 50, aged 30, with worked-out values. */
export const thugHumanNpc: HumanNpc = {
  ...knottHumanNpc,
  name: 'Thug',
  age: 30,
  details: emptyDetails,
  characteristics: {
    values: { STR: 70, CON: 60, DEX: 55, APP: null, POW: 50, SIZ: 65, INT: null, EDU: null },
    difficulty: { STR: 'Hard', CON: 'Hard', DEX: 'Hard', POW: 'Hard', SIZ: 'Hard' },
    derived: { hitPoints: 12, magicPoints: 10, damageBonus: '+1D4', build: 1, movementRate: 8, movementRateNotCovered: false },
  },
}

/** A fully filled profile: every section, a firearm, and a spell. */
export const gangsterHumanNpc: HumanNpc = {
  ...thugHumanNpc,
  name: 'Gangster',
  details: {
    professionOrRole: 'Enforcer',
    shortDescription: 'A broad man in a grey suit.',
    goal: 'Collect the debt',
    relationshipToInvestigators: 'Rival',
    knowledge: 'Where the ledger is kept.',
    secrets: 'Works for the mayor.',
    behaviorCue: 'Cracks his knuckles.',
  },
  skills: [
    { name: 'Spot Hidden', specialization: null, value: 55, difficulty: 'Hard' },
    { name: 'Firearms', specialization: 'Handgun', value: 90, difficulty: 'Extreme' },
    { name: 'Fighting', specialization: 'Brawl', value: 40, difficulty: 'Regular' },
  ],
  combat: {
    dodge: 40,
    dodgeDifficulty: 'Regular',
    armorPoints: 1,
    tacticsAndMorale: 'Flees at half Hit Points.',
    weapons: [
      {
        name: 'Revolver',
        skill: { name: 'Firearms', specialization: 'Handgun' },
        damage: '1D10',
        attacksPerRound: 1,
        range: '15 yards',
        ammunition: '6',
        malfunction: '100',
        impaling: true,
      },
      { name: 'Fists', skill: { name: 'Fighting', specialization: 'Brawl' }, damage: '1D3+DB', attacksPerRound: 1, range: null, ammunition: null, malfunction: null, impaling: false },
    ],
  },
  spells: [{ name: 'Contact Deity', magicPointCost: '5', effect: 'Summons a god.' }],
}

/** Old Whateley: STR, DEX, and SIZ present, aged 95, so MOV is not covered. */
export const whateleyHumanNpc: HumanNpc = {
  ...knottHumanNpc,
  name: 'Old Whateley',
  age: 95,
  details: emptyDetails,
  characteristics: {
    values: { STR: 40, CON: null, DEX: 40, APP: null, POW: null, SIZ: 60, INT: null, EDU: null },
    difficulty: { STR: 'Regular', DEX: 'Regular', SIZ: 'Hard' },
    derived: { hitPoints: null, magicPoints: null, damageBonus: '-1', build: -1, movementRate: null, movementRateNotCovered: true },
  },
}
