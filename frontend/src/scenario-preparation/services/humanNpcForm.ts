import type { Dispatch } from 'react'

import { fieldId } from '@/campaign-play/services/fieldIds'
import {
  CHARACTERISTIC_CODES,
  type HumanNpc,
  type HumanNpcDetails,
  type HumanNpcInput,
} from '@/scenario-preparation/types/HumanNpc'
import {
  type CharacteristicCode,
  HUMAN_NPC_AGE_MAXIMUM,
  NON_PLAYER_ENTITY_NAME_MAX_LENGTH,
} from '@/scenario-preparation/types/NonPlayerEntity'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'
import { focusAfterRemoval, MAX_ROWS, replaceAt, rowPath } from '@/scenario-preparation/services/profileForm'
import type { RichTextDocument } from '@/shared/types/RichText'

export type SectionName = 'characteristics' | 'skills' | 'combat' | 'spells'

/** The optional sections in their fixed order (specs/scenario-preparation/ux.md section 25.4). */
export const SECTION_ORDER: SectionName[] = ['characteristics', 'skills', 'combat', 'spells']

export const SECTION_LABELS: Record<SectionName, string> = {
  characteristics: 'Characteristics',
  skills: 'Skills',
  combat: 'Combat',
  spells: 'Spells',
}

export type DetailKey = keyof HumanNpcDetails

export const DETAIL_KEYS: DetailKey[] = [
  'professionOrRole',
  'shortDescription',
  'goal',
  'relationshipToInvestigators',
  'knowledge',
  'secrets',
  'behaviorCue',
]

export interface SkillRowState {
  key: number
  name: string
  specialization: string
  value: number | null
}

export interface WeaponRowState {
  key: number
  name: string
  /** The key of the skill row this weapon uses; the skill follows that row if it is renamed. */
  skillKey: number | null
  damage: string
  attacksPerRound: number | null
  range: string
  ammunition: string
  malfunction: string
  impaling: boolean
}

export interface SpellRowState {
  key: number
  name: string
  magicPointCost: string
  effect: string
}

export interface CombatState {
  dodge: number | null
  armorPoints: number | null
  tacticsAndMorale: string
  weapons: WeaponRowState[]
}

export interface HumanNpcFormState {
  name: string
  age: number | null
  details: Record<DetailKey, string>
  characteristics: Record<CharacteristicCode, number | null> | null
  skills: SkillRowState[] | null
  combat: CombatState | null
  spells: SpellRowState[] | null
  nextKey: number
  /** The id of the control that should take focus after the last change; cleared once it has. */
  focusTarget: string | null
  /** The polite live-region message for the last section change. */
  announcement: string
}

const EMPTY_CHARACTERISTICS = Object.fromEntries(CHARACTERISTIC_CODES.map((code) => [code, null])) as Record<CharacteristicCode, number | null>

/** The id of the "Add {item}" button of a list. */
export const addRowButtonId = (list: 'skills' | 'combat.weapons' | 'spells'): string => `add-${list.replace('.', '-')}`

/** The id of the "Add {section}" button in the "Add a section" group. */
export const addSectionButtonId = (section: SectionName): string => `add-section-${section}`

const text = (value: string | null): string => value ?? ''

function skillKeyOf(npc: HumanNpc, reference: { name: string | null; specialization: string | null } | null, keys: number[]): number | null {
  const index = (npc.skills ?? []).findIndex(
    (skill) =>
      reference !== null &&
      (skill.name ?? '').toLowerCase() === (reference.name ?? '').toLowerCase() &&
      (skill.specialization ?? '').toLowerCase() === (reference.specialization ?? '').toLowerCase(),
  )
  return index === -1 ? null : keys[index]
}

/** The editable state for a saved Human NPC; blank text is "" and the rows get fresh keys. */
export function stateFromHumanNpc(npc: HumanNpc): HumanNpcFormState {
  let nextKey = 0
  const skillKeys = (npc.skills ?? []).map(() => nextKey++)
  const skills = npc.skills?.map((skill, index) => ({
    key: skillKeys[index],
    name: text(skill.name),
    specialization: text(skill.specialization),
    value: skill.value,
  }))
  const combat = npc.combat && {
    dodge: npc.combat.dodge,
    armorPoints: npc.combat.armorPoints,
    tacticsAndMorale: text(npc.combat.tacticsAndMorale),
    weapons: npc.combat.weapons.map((weapon) => ({
      key: nextKey++,
      name: text(weapon.name),
      skillKey: skillKeyOf(npc, weapon.skill, skillKeys),
      damage: text(weapon.damage),
      attacksPerRound: weapon.attacksPerRound,
      range: text(weapon.range),
      ammunition: text(weapon.ammunition),
      malfunction: text(weapon.malfunction),
      impaling: weapon.impaling,
    })),
  }
  const spells = npc.spells?.map((spell) => ({
    key: nextKey++,
    name: text(spell.name),
    magicPointCost: text(spell.magicPointCost),
    effect: text(spell.effect),
  }))

  return {
    name: npc.name,
    age: npc.age,
    details: Object.fromEntries(DETAIL_KEYS.map((key) => [key, text(npc.details[key])])) as Record<DetailKey, string>,
    characteristics: npc.characteristics
      ? (Object.fromEntries(CHARACTERISTIC_CODES.map((code) => [code, npc.characteristics?.values[code] ?? null])) as Record<CharacteristicCode, number | null>)
      : null,
    skills: skills ?? null,
    combat: combat ?? null,
    spells: spells ?? null,
    nextKey,
    focusTarget: null,
    announcement: '',
  }
}

const orNull = (value: string): string | null => (value.trim() === '' ? null : value)

/** The save request for the form state; the server trims, checks, and works out everything derived. */
export function inputFromState(state: HumanNpcFormState, keeperNotes: RichTextDocument | null): HumanNpcInput {
  const skills = state.skills
  const skillReferenceOf = (key: number | null) => {
    const row = skills?.find((skill) => skill.key === key)
    return row ? { name: orNull(row.name), specialization: orNull(row.specialization) } : null
  }

  return {
    name: state.name,
    age: state.age,
    details: Object.fromEntries(DETAIL_KEYS.map((key) => [key, orNull(state.details[key])])) as unknown as HumanNpcDetails,
    keeperNotes,
    characteristics: state.characteristics ? { ...state.characteristics } : null,
    skills: skills?.map((row) => ({ name: orNull(row.name), specialization: orNull(row.specialization), value: row.value })) ?? null,
    combat: state.combat && {
      dodge: state.combat.dodge,
      armorPoints: state.combat.armorPoints,
      tacticsAndMorale: orNull(state.combat.tacticsAndMorale),
      weapons: state.combat.weapons.map((weapon) => ({
        name: orNull(weapon.name),
        skill: skillReferenceOf(weapon.skillKey),
        damage: orNull(weapon.damage),
        attacksPerRound: weapon.attacksPerRound,
        range: orNull(weapon.range),
        ammunition: orNull(weapon.ammunition),
        malfunction: orNull(weapon.malfunction),
        impaling: weapon.impaling,
      })),
    },
    spells: state.spells?.map((spell) => ({
      name: orNull(spell.name),
      magicPointCost: orNull(spell.magicPointCost),
      effect: orNull(spell.effect),
    })) ?? null,
  }
}

/** True when a section holds any entered value, so removing it asks first (ux.md section 25.2). */
export function sectionHasValues(state: HumanNpcFormState, section: SectionName): boolean {
  switch (section) {
    case 'characteristics':
      return Object.values(state.characteristics ?? {}).some((value) => value !== null)
    case 'skills':
      return (state.skills ?? []).length > 0
    case 'spells':
      return (state.spells ?? []).length > 0
    case 'combat':
      return combatHasValues(state.combat)
  }
}

function combatHasValues(combat: CombatState | null): boolean {
  return combat !== null && (combat.dodge !== null || combat.armorPoints !== null || combat.tacticsAndMorale !== '' || combat.weapons.length > 0)
}

/** Every request path that has a field on screen, so a server problem can be matched to its field in any letter case. */
export function fieldPaths(state: HumanNpcFormState): string[] {
  const paths = ['name', 'age', ...DETAIL_KEYS.map((key) => `details.${key}`), 'keeperNotes']
  if (state.characteristics) {
    paths.push(...CHARACTERISTIC_CODES.map((code) => `characteristics.${code}`))
  }
  state.skills?.forEach((_, index) => paths.push(...['name', 'specialization', 'value'].map((field) => rowPath('skills', index, field))))
  if (state.combat) {
    paths.push('combat.dodge', 'combat.armorPoints', 'combat.tacticsAndMorale')
    state.combat.weapons.forEach((_, index) =>
      paths.push(
        ...['name', 'skill', 'damage', 'attacksPerRound', 'range', 'ammunition', 'malfunction'].map((field) => rowPath('combat.weapons', index, field)),
      ),
    )
  }
  state.spells?.forEach((_, index) => paths.push(...['name', 'magicPointCost', 'effect'].map((field) => rowPath('spells', index, field))))
  return paths
}

/** The DOM id of the control for a request path. */
export const controlIdFor = (path: string): string => (path === 'keeperNotes' ? 'human-npc-keeper-notes' : fieldId(path))

export type IdentityErrors = Partial<Record<'name' | 'age', string>>

/** The only rules the client checks: Name is filled and Age is a whole number from 0 to 150 (ux.md section 25.2). */
export function identityErrors(state: HumanNpcFormState): IdentityErrors {
  const errors: IdentityErrors = {}
  const name = state.name.trim()
  if (name === '') {
    errors.name = 'Enter a name.'
  } else if (name.length > NON_PLAYER_ENTITY_NAME_MAX_LENGTH) {
    errors.name = `Name must be ${NON_PLAYER_ENTITY_NAME_MAX_LENGTH} characters or fewer.`
  }
  if (state.age === null) {
    errors.age = 'Enter an age.'
  } else if (state.age < 0 || state.age > HUMAN_NPC_AGE_MAXIMUM) {
    errors.age = `Enter an age from 0 to ${HUMAN_NPC_AGE_MAXIMUM}, in whole years.`
  }
  return errors
}

/** One problem to list in the error summary: its message and the canonical path of its field, when it has one. */
export interface SummaryProblem {
  message: string
  /** The path of the field the link focuses; null when no field matches (listed without a link). */
  path: string | null
}

/** Pairs each server message with its field by case-insensitive path (ADR 0018). */
export function summaryProblems(state: HumanNpcFormState, problems: ValidationProblem[]): SummaryProblem[] {
  const known = new Map(fieldPaths(state).map((path) => [path.toLowerCase(), path]))
  return problems.flatMap((problem) =>
    problem.messages.map((message) => ({ message, path: known.get(problem.path.toLowerCase()) ?? null })),
  )
}

type SkillField = 'name' | 'specialization'
type WeaponTextField = 'name' | 'damage' | 'range' | 'ammunition' | 'malfunction'
type SpellField = 'name' | 'magicPointCost' | 'effect'

export type HumanNpcFormAction =
  | { type: 'setName'; value: string }
  | { type: 'setAge'; value: number | null }
  | { type: 'setDetail'; key: DetailKey; value: string }
  | { type: 'addSection'; section: SectionName }
  | { type: 'removeSection'; section: SectionName }
  | { type: 'setCharacteristic'; code: CharacteristicCode; value: number | null }
  | { type: 'addSkill' }
  | { type: 'removeSkill'; index: number }
  | { type: 'setSkillText'; index: number; field: SkillField; value: string }
  | { type: 'setSkillValue'; index: number; value: number | null }
  | { type: 'setDodge'; value: number | null }
  | { type: 'setArmorPoints'; value: number | null }
  | { type: 'setTactics'; value: string }
  | { type: 'addWeapon' }
  | { type: 'removeWeapon'; index: number }
  | { type: 'setWeaponText'; index: number; field: WeaponTextField; value: string }
  | { type: 'setWeaponSkill'; index: number; skillKey: number | null }
  | { type: 'setWeaponAttacks'; index: number; value: number | null }
  | { type: 'setWeaponImpaling'; index: number; value: boolean }
  | { type: 'addSpell' }
  | { type: 'removeSpell'; index: number }
  | { type: 'setSpellText'; index: number; field: SpellField; value: string }
  | { type: 'clearFocus' }

type Handler<K extends HumanNpcFormAction['type']> = (state: HumanNpcFormState, action: Extract<HumanNpcFormAction, { type: K }>) => HumanNpcFormState

const SECTION_INITIAL: { [S in SectionName]: (state: HumanNpcFormState) => Partial<HumanNpcFormState> } = {
  characteristics: () => ({ characteristics: { ...EMPTY_CHARACTERISTICS } }),
  skills: () => ({ skills: [] }),
  combat: () => ({ combat: { dodge: null, armorPoints: null, tacticsAndMorale: '', weapons: [] } }),
  spells: () => ({ spells: [] }),
}

const SECTION_FIRST_CONTROL: Record<SectionName, string> = {
  characteristics: controlIdFor('characteristics.STR'),
  skills: addRowButtonId('skills'),
  combat: controlIdFor('combat.dodge'),
  spells: addRowButtonId('spells'),
}

function withCombat(state: HumanNpcFormState, change: (combat: CombatState) => Partial<CombatState>): HumanNpcFormState {
  return state.combat ? { ...state, combat: { ...state.combat, ...change(state.combat) } } : state
}

const handlers: { [K in HumanNpcFormAction['type']]: Handler<K> } = {
  setName: (state, action) => ({ ...state, name: action.value }),
  setAge: (state, action) => ({ ...state, age: action.value }),
  setDetail: (state, action) => ({ ...state, details: { ...state.details, [action.key]: action.value } }),
  addSection: (state, action) => ({
    ...state,
    ...SECTION_INITIAL[action.section](state),
    focusTarget: SECTION_FIRST_CONTROL[action.section],
    announcement: `${SECTION_LABELS[action.section]} section added.`,
  }),
  removeSection: (state, action) => ({
    ...state,
    [action.section]: null,
    focusTarget: addSectionButtonId(action.section),
    announcement: `${SECTION_LABELS[action.section]} section removed.`,
  }),
  setCharacteristic: (state, action) =>
    state.characteristics ? { ...state, characteristics: { ...state.characteristics, [action.code]: action.value } } : state,
  addSkill: (state) =>
    (state.skills?.length ?? 0) >= MAX_ROWS
      ? state
      : {
          ...state,
          skills: [...(state.skills ?? []), { key: state.nextKey, name: '', specialization: '', value: null }],
          nextKey: state.nextKey + 1,
          focusTarget: controlIdFor(rowPath('skills', state.skills?.length ?? 0, 'name')),
        },
  removeSkill: (state, action) => {
    const skills = (state.skills ?? []).filter((_, index) => index !== action.index)
    return { ...state, skills, focusTarget: focusAfterRemoval('skills', skills.length, action.index, 'name', addRowButtonId('skills')) }
  },
  setSkillText: (state, action) => ({ ...state, skills: replaceAt(state.skills ?? [], action.index, { [action.field]: action.value }) }),
  setSkillValue: (state, action) => ({ ...state, skills: replaceAt(state.skills ?? [], action.index, { value: action.value }) }),
  setDodge: (state, action) => withCombat(state, () => ({ dodge: action.value })),
  setArmorPoints: (state, action) => withCombat(state, () => ({ armorPoints: action.value })),
  setTactics: (state, action) => withCombat(state, () => ({ tacticsAndMorale: action.value })),
  addWeapon: (state) =>
    !state.combat || state.combat.weapons.length >= MAX_ROWS
      ? state
      : {
          ...withCombat(state, (combat) => ({
            weapons: [
              ...combat.weapons,
              { key: state.nextKey, name: '', skillKey: null, damage: '', attacksPerRound: null, range: '', ammunition: '', malfunction: '', impaling: false },
            ],
          })),
          nextKey: state.nextKey + 1,
          focusTarget: controlIdFor(rowPath('combat.weapons', state.combat.weapons.length, 'name')),
        },
  removeWeapon: (state, action) => {
    const weapons = (state.combat?.weapons ?? []).filter((_, index) => index !== action.index)
    return {
      ...withCombat(state, () => ({ weapons })),
      focusTarget: focusAfterRemoval('combat.weapons', weapons.length, action.index, 'name', addRowButtonId('combat.weapons')),
    }
  },
  setWeaponText: (state, action) =>
    withCombat(state, (combat) => ({ weapons: replaceAt(combat.weapons, action.index, { [action.field]: action.value }) })),
  setWeaponSkill: (state, action) =>
    withCombat(state, (combat) => ({ weapons: replaceAt(combat.weapons, action.index, { skillKey: action.skillKey }) })),
  setWeaponAttacks: (state, action) =>
    withCombat(state, (combat) => ({ weapons: replaceAt(combat.weapons, action.index, { attacksPerRound: action.value }) })),
  setWeaponImpaling: (state, action) =>
    withCombat(state, (combat) => ({ weapons: replaceAt(combat.weapons, action.index, { impaling: action.value }) })),
  addSpell: (state) =>
    (state.spells?.length ?? 0) >= MAX_ROWS
      ? state
      : {
          ...state,
          spells: [...(state.spells ?? []), { key: state.nextKey, name: '', magicPointCost: '', effect: '' }],
          nextKey: state.nextKey + 1,
          focusTarget: controlIdFor(rowPath('spells', state.spells?.length ?? 0, 'name')),
        },
  removeSpell: (state, action) => {
    const spells = (state.spells ?? []).filter((_, index) => index !== action.index)
    return { ...state, spells, focusTarget: focusAfterRemoval('spells', spells.length, action.index, 'name', addRowButtonId('spells')) }
  },
  setSpellText: (state, action) => ({ ...state, spells: replaceAt(state.spells ?? [], action.index, { [action.field]: action.value }) }),
  clearFocus: (state) => ({ ...state, focusTarget: null }),
}

/** The Human NPC form's reducer: one handler per action, so no branch grows past the complexity limit. */
export function humanNpcFormReducer(state: HumanNpcFormState, action: HumanNpcFormAction): HumanNpcFormState {
  const handler = handlers[action.type] as (current: HumanNpcFormState, performed: HumanNpcFormAction) => HumanNpcFormState
  return handler(state, action)
}

/** What every section's fields need: the state, the reducer's dispatch, and the server's message for a field path. */
export interface SectionFieldsProps {
  state: HumanNpcFormState
  dispatch: Dispatch<HumanNpcFormAction>
  errorOf: (path: string) => string | undefined
}
