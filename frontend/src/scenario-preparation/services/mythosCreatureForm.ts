import type { Dispatch } from 'react'

import { handlers } from '@/scenario-preparation/services/mythosCreatureFormHandlers'
import { SECTION_ORDER, type SectionName } from '@/scenario-preparation/services/mythosCreatureSections'
import { rowPath, summaryProblemsFor, type SummaryProblem } from '@/scenario-preparation/services/profileForm'
import {
  MONSTER_CHARACTERISTIC_CODES,
  type CreatureKind,
  type MonsterCharacteristicCode,
  type MonsterDetails,
  type MovementMode,
  type MythosCreature,
  type MythosCreatureInput,
} from '@/scenario-preparation/types/MythosCreature'
import { NON_PLAYER_ENTITY_NAME_MAX_LENGTH } from '@/scenario-preparation/types/NonPlayerEntity'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'
import type { RichTextDocument } from '@/shared/types/RichText'

export type NarrativeKey = Exclude<keyof MonsterDetails, 'creatureKind'>

export const NARRATIVE_KEYS: NarrativeKey[] = [
  'descriptionAndSensoryCues',
  'origin',
  'goalAndBehavior',
  'signsAndTraces',
  'defeatOutcome',
  'specimenRangeNotes',
]

export type HitPointsMode = 'computed' | 'override' | 'notApplicable'

export type NumberOverrideKind = 'hitPoints' | 'magicPoints' | 'build'
export type OptionalOverrideKind = 'magicPoints' | 'damageBonus' | 'build'
export type OverrideKind = NumberOverrideKind | 'damageBonus'

export interface NumberOverrideState {
  value: number | null
  reason: string
}

export interface DamageBonusOverrideState {
  value: string
  reason: string
}

export interface CharacteristicsState {
  values: Record<MonsterCharacteristicCode, number | null>
  /** APP and EDU are offered through "Add APP" and "Add EDU" unless they have a value (ux.md section 25.5). */
  extraShown: { APP: boolean; EDU: boolean }
  hitPointsMode: HitPointsMode
  hitPoints: NumberOverrideState
  /** An override is null while its checkbox is cleared; clearing it drops its value and reason. */
  magicPoints: NumberOverrideState | null
  damageBonus: DamageBonusOverrideState | null
  build: NumberOverrideState | null
}

export interface MovementRowState {
  key: number
  mode: MovementMode
  label: string
  rate: number | null
}

export interface AttackRowState {
  key: number
  name: string
  skill: string
  skillValue: number | null
  damage: string
  effect: string
  manoeuvre: boolean
}

export interface CombatState {
  attacksPerRound: number | null
  dodge: number | null
  attacks: AttackRowState[]
}

export interface DefenseRowState {
  key: number
  description: string
}

export interface DefensesState {
  armorPoints: number | null
  armorNote: string
  immunities: DefenseRowState[]
  vulnerabilities: DefenseRowState[]
}

export interface SkillRowState {
  key: number
  name: string
  value: number | null
}

export interface SpellRowState {
  key: number
  name: string
  magicPointCost: string
  effect: string
}

export interface PowerRowState extends SpellRowState {
  limits: string
}

export interface MythosCreatureFormState {
  name: string
  creatureKind: CreatureKind | null
  details: Record<NarrativeKey, string>
  characteristics: CharacteristicsState | null
  movement: MovementRowState[] | null
  combat: CombatState | null
  defenses: DefensesState | null
  skills: SkillRowState[] | null
  spells: SpellRowState[] | null
  powers: PowerRowState[] | null
  /** Null when the section was not added; "" when it was added and is empty. */
  sanityLoss: string | null
  nextKey: number
  /** The id of the control that should take focus after the last change; cleared once it has. */
  focusTarget: string | null
  /** The polite live-region message for the last section change. */
  announcement: string
}

type DefenseList = 'immunities' | 'vulnerabilities'
type AttackTextField = 'name' | 'skill' | 'damage' | 'effect'
type SpellTextField = 'name' | 'magicPointCost' | 'effect'

export type MythosCreatureFormAction =
  | { type: 'setName'; value: string }
  | { type: 'setCreatureKind'; value: CreatureKind | null }
  | { type: 'setDetail'; key: NarrativeKey; value: string }
  | { type: 'addSection'; section: SectionName }
  | { type: 'removeSection'; section: SectionName }
  | { type: 'setCharacteristic'; code: MonsterCharacteristicCode; value: number | null }
  | { type: 'showCharacteristic'; code: 'APP' | 'EDU' }
  | { type: 'setHitPointsMode'; mode: HitPointsMode }
  | { type: 'setOverrideEnabled'; override: OptionalOverrideKind; enabled: boolean }
  | { type: 'setOverrideNumber'; override: NumberOverrideKind; value: number | null }
  | { type: 'setDamageBonusOverride'; value: string }
  | { type: 'setOverrideReason'; override: OverrideKind; value: string }
  | { type: 'addMovement' }
  | { type: 'removeMovement'; index: number }
  | { type: 'setMovementMode'; index: number; mode: MovementMode }
  | { type: 'setMovementLabel'; index: number; value: string }
  | { type: 'setMovementRate'; index: number; value: number | null }
  | { type: 'setAttacksPerRound'; value: number | null }
  | { type: 'setDodge'; value: number | null }
  | { type: 'addAttack' }
  | { type: 'removeAttack'; index: number }
  | { type: 'setAttackText'; index: number; field: AttackTextField; value: string }
  | { type: 'setAttackValue'; index: number; value: number | null }
  | { type: 'setAttackManoeuvre'; index: number; value: boolean }
  | { type: 'setArmorPoints'; value: number | null }
  | { type: 'setArmorNote'; value: string }
  | { type: 'addDefenseEntry'; list: DefenseList }
  | { type: 'removeDefenseEntry'; list: DefenseList; index: number }
  | { type: 'setDefenseEntry'; list: DefenseList; index: number; value: string }
  | { type: 'addSkill' }
  | { type: 'removeSkill'; index: number }
  | { type: 'setSkillName'; index: number; value: string }
  | { type: 'setSkillValue'; index: number; value: number | null }
  | { type: 'addSpell' }
  | { type: 'removeSpell'; index: number }
  | { type: 'setSpellText'; index: number; field: SpellTextField; value: string }
  | { type: 'addPower' }
  | { type: 'removePower'; index: number }
  | { type: 'setPowerText'; index: number; field: SpellTextField | 'limits'; value: string }
  | { type: 'setSanityLoss'; value: string }
  | { type: 'clearFocus' }

const text = (value: string | null): string => value ?? ''
const orNull = (value: string): string | null => (value.trim() === '' ? null : value)

const mapRows = <T, U>(rowList: T[] | null, map: (row: T) => U): U[] | null => (rowList ? rowList.map(map) : null)

function emptyNarrative(details: MonsterDetails): Record<NarrativeKey, string> {
  return Object.fromEntries(NARRATIVE_KEYS.map((key) => [key, text(details[key])])) as Record<NarrativeKey, string>
}

function hitPointsModeOf(creature: MythosCreature): HitPointsMode {
  if (creature.characteristics?.overrides.hitPoints) {
    return 'override'
  }
  return creature.characteristics?.hitPointsNotApplicable ? 'notApplicable' : 'computed'
}

function stateOfCharacteristics(creature: MythosCreature): CharacteristicsState | null {
  const characteristics = creature.characteristics
  if (!characteristics) {
    return null
  }
  const values = Object.fromEntries(MONSTER_CHARACTERISTIC_CODES.map((code) => [code, characteristics.values[code] ?? null])) as Record<
    MonsterCharacteristicCode,
    number | null
  >
  const { overrides } = characteristics
  const numberState = (override: { value: number | null; reason: string | null } | null): NumberOverrideState | null =>
    override ? { value: override.value, reason: text(override.reason) } : null
  return {
    values,
    extraShown: { APP: values.APP !== null, EDU: values.EDU !== null },
    hitPointsMode: hitPointsModeOf(creature),
    hitPoints: numberState(overrides.hitPoints) ?? { value: null, reason: '' },
    magicPoints: numberState(overrides.magicPoints),
    damageBonus: overrides.damageBonus ? { value: text(overrides.damageBonus.value), reason: text(overrides.damageBonus.reason) } : null,
    build: numberState(overrides.build),
  }
}

type KeyMaker = () => number

function stateOfMovement(creature: MythosCreature, key: KeyMaker): MovementRowState[] | null {
  return mapRows(creature.movement, (mode) => ({ key: key(), mode: mode.mode, label: text(mode.label), rate: mode.rate }))
}

function stateOfCombat(creature: MythosCreature, key: KeyMaker): CombatState | null {
  const combat = creature.combat
  return combat
    ? {
        attacksPerRound: combat.attacksPerRound,
        dodge: combat.dodge,
        attacks: combat.attacks.map((attack) => ({
          key: key(),
          name: text(attack.name),
          skill: text(attack.skill),
          skillValue: attack.skillValue,
          damage: text(attack.damage),
          effect: text(attack.effect),
          manoeuvre: attack.manoeuvre,
        })),
      }
    : null
}

function stateOfDefenses(creature: MythosCreature, key: KeyMaker): DefensesState | null {
  const defenses = creature.defenses
  const entry = (row: { description: string | null }) => ({ key: key(), description: text(row.description) })
  return defenses
    ? {
        armorPoints: defenses.armorPoints,
        armorNote: text(defenses.armorNote),
        immunities: defenses.immunities.map(entry),
        vulnerabilities: defenses.vulnerabilities.map(entry),
      }
    : null
}

function stateOfSpellLike(creature: MythosCreature, key: KeyMaker): Pick<MythosCreatureFormState, 'spells' | 'powers'> {
  const spellOf = (spell: { name: string | null; magicPointCost: string | null; effect: string | null }) => ({
    key: key(),
    name: text(spell.name),
    magicPointCost: text(spell.magicPointCost),
    effect: text(spell.effect),
  })
  return {
    spells: mapRows(creature.spells, spellOf),
    powers: mapRows(creature.powers, (power) => ({ ...spellOf(power), limits: text(power.limits) })),
  }
}

/** The editable state for a saved Mythos Creature; blank text is "" and the rows get fresh keys. */
export function stateFromMythosCreature(creature: MythosCreature): MythosCreatureFormState {
  let nextKey = 0
  const key = () => nextKey++

  return {
    name: creature.name,
    creatureKind: creature.details.creatureKind,
    details: emptyNarrative(creature.details),
    characteristics: stateOfCharacteristics(creature),
    movement: stateOfMovement(creature, key),
    combat: stateOfCombat(creature, key),
    defenses: stateOfDefenses(creature, key),
    skills: mapRows(creature.skills, (skill) => ({ key: key(), name: text(skill.name), value: skill.value })),
    ...stateOfSpellLike(creature, key),
    sanityLoss: creature.sanityLoss ? text(creature.sanityLoss.value) : null,
    nextKey,
    focusTarget: null,
    announcement: '',
  }
}

function inputOfCharacteristics(state: CharacteristicsState): NonNullable<MythosCreatureInput['characteristics']> {
  const numberOverride = (override: NumberOverrideState | null) => (override ? { value: override.value, reason: orNull(override.reason) } : null)
  return {
    values: { ...state.values },
    hitPointsNotApplicable: state.hitPointsMode === 'notApplicable',
    overrides: {
      hitPoints: state.hitPointsMode === 'override' ? numberOverride(state.hitPoints) : null,
      magicPoints: numberOverride(state.magicPoints),
      damageBonus: state.damageBonus ? { value: orNull(state.damageBonus.value), reason: orNull(state.damageBonus.reason) } : null,
      build: numberOverride(state.build),
    },
  }
}

function inputOfCombat(combat: CombatState): NonNullable<MythosCreatureInput['combat']> {
  return {
    attacksPerRound: combat.attacksPerRound,
    dodge: combat.dodge,
    attacks: combat.attacks.map((attack) => ({
      name: orNull(attack.name),
      skill: orNull(attack.skill),
      skillValue: attack.skillValue,
      damage: orNull(attack.damage),
      effect: orNull(attack.effect),
      manoeuvre: attack.manoeuvre,
    })),
  }
}

function inputOfDefenses(defenses: DefensesState): NonNullable<MythosCreatureInput['defenses']> {
  const entry = (row: DefenseRowState) => ({ description: orNull(row.description) })
  return {
    armorPoints: defenses.armorPoints,
    armorNote: orNull(defenses.armorNote),
    immunities: defenses.immunities.map(entry),
    vulnerabilities: defenses.vulnerabilities.map(entry),
  }
}

/** The save request for the form state; the server trims, checks, and works out everything derived. */
export function inputFromState(state: MythosCreatureFormState, keeperNotes: RichTextDocument | null): MythosCreatureInput {
  const spellOf = (spell: SpellRowState) => ({ name: orNull(spell.name), magicPointCost: orNull(spell.magicPointCost), effect: orNull(spell.effect) })

  return {
    name: state.name,
    details: {
      creatureKind: state.creatureKind,
      ...(Object.fromEntries(NARRATIVE_KEYS.map((key) => [key, orNull(state.details[key])])) as Record<NarrativeKey, string | null>),
    },
    keeperNotes,
    characteristics: state.characteristics && inputOfCharacteristics(state.characteristics),
    movement: mapRows(state.movement, (row) => ({ mode: row.mode, label: row.mode === 'Other' ? orNull(row.label) : null, rate: row.rate })),
    combat: state.combat && inputOfCombat(state.combat),
    defenses: state.defenses && inputOfDefenses(state.defenses),
    skills: mapRows(state.skills, (row) => ({ name: orNull(row.name), value: row.value })),
    spells: mapRows(state.spells, spellOf),
    powers: mapRows(state.powers, (power) => ({ ...spellOf(power), limits: orNull(power.limits) })),
    sanityLoss: state.sanityLoss === null ? null : { value: orNull(state.sanityLoss) },
  }
}

const SECTION_HAS_VALUES: { [S in SectionName]: (state: MythosCreatureFormState) => boolean } = {
  characteristics: ({ characteristics }) =>
    characteristics !== null &&
    (Object.values(characteristics.values).some((value) => value !== null) ||
      characteristics.hitPointsMode !== 'computed' ||
      characteristics.magicPoints !== null ||
      characteristics.damageBonus !== null ||
      characteristics.build !== null),
  movement: ({ movement }) => (movement ?? []).length > 0,
  combat: ({ combat }) => combat !== null && (combat.attacksPerRound !== null || combat.dodge !== null || combat.attacks.length > 0),
  defenses: ({ defenses }) =>
    defenses !== null && (defenses.armorPoints !== null || defenses.armorNote !== '' || defenses.immunities.length > 0 || defenses.vulnerabilities.length > 0),
  skills: ({ skills }) => (skills ?? []).length > 0,
  spells: ({ spells }) => (spells ?? []).length > 0,
  powers: ({ powers }) => (powers ?? []).length > 0,
  sanityLoss: ({ sanityLoss }) => sanityLoss !== null && sanityLoss !== '',
}

/** True when a section holds any entered value, so removing it asks first (ux.md section 25.2). */
export function sectionHasValues(state: MythosCreatureFormState, section: SectionName): boolean {
  return SECTION_HAS_VALUES[section](state)
}

/** The sections that are added, in their fixed order; the section index lists these (SP-UX-45). */
export function presentSections(state: MythosCreatureFormState): SectionName[] {
  return SECTION_ORDER.filter((section) => state[section] !== null)
}

const rows = (list: string, count: number, fields: string[]): string[] =>
  Array.from({ length: count }, (_, index) => fields.map((field) => rowPath(list, index, field))).flat()

function characteristicPaths(state: CharacteristicsState): string[] {
  const codes = MONSTER_CHARACTERISTIC_CODES.filter((code) => (code !== 'APP' && code !== 'EDU') || state.extraShown[code])
  const overridePaths = (kind: OverrideKind, present: boolean) =>
    present ? [`characteristics.overrides.${kind}.value`, `characteristics.overrides.${kind}.reason`] : []
  return [
    ...codes.map((code) => `characteristics.values.${code}`),
    ...(state.hitPointsMode === 'notApplicable' ? ['characteristics.hitPointsNotApplicable'] : []),
    ...overridePaths('hitPoints', state.hitPointsMode === 'override'),
    ...overridePaths('magicPoints', state.magicPoints !== null),
    ...overridePaths('damageBonus', state.damageBonus !== null),
    ...overridePaths('build', state.build !== null),
  ]
}

const movementPaths = (movement: MovementRowState[]): string[] =>
  movement.flatMap((row, index) => [
    rowPath('movement', index, 'mode'),
    rowPath('movement', index, 'rate'),
    ...(row.mode === 'Other' ? [rowPath('movement', index, 'label')] : []),
  ])

const combatPaths = (combat: CombatState): string[] => [
  'combat.attacksPerRound',
  'combat.dodge',
  ...rows('combat.attacks', combat.attacks.length, ['name', 'skill', 'skillValue', 'damage', 'effect']),
]

const defensesPaths = (defenses: DefensesState): string[] => [
  'defenses.armorPoints',
  'defenses.armorNote',
  ...rows('defenses.immunities', defenses.immunities.length, ['description']),
  ...rows('defenses.vulnerabilities', defenses.vulnerabilities.length, ['description']),
]

const optionalPaths = <T>(value: T | null, pathsOf: (present: T) => string[]): string[] => (value === null ? [] : pathsOf(value))

function sectionPaths(state: MythosCreatureFormState): string[] {
  return [
    ...optionalPaths(state.characteristics, characteristicPaths),
    ...optionalPaths(state.movement, movementPaths),
    ...optionalPaths(state.combat, combatPaths),
    ...optionalPaths(state.defenses, defensesPaths),
    ...optionalPaths(state.skills, (list) => rows('skills', list.length, ['name', 'value'])),
    ...optionalPaths(state.spells, (list) => rows('spells', list.length, ['name', 'magicPointCost', 'effect'])),
    ...optionalPaths(state.powers, (list) => rows('powers', list.length, ['name', 'magicPointCost', 'effect', 'limits'])),
    ...optionalPaths(state.sanityLoss, () => ['sanityLoss.value']),
  ]
}

/** Every request path that has a field on screen, so a server problem can be matched to its field in any letter case. */
export function fieldPaths(state: MythosCreatureFormState): string[] {
  return ['name', 'details.creatureKind', ...NARRATIVE_KEYS.map((key) => `details.${key}`), 'keeperNotes', ...sectionPaths(state)]
}

export type IdentityErrors = Partial<Record<'name', string>>

/** The only rule the client checks: Name is filled and at most 200 characters (ux.md section 25.2). */
export function identityErrors(state: MythosCreatureFormState): IdentityErrors {
  const name = state.name.trim()
  if (name === '') {
    return { name: 'Enter a name.' }
  }
  return name.length > NON_PLAYER_ENTITY_NAME_MAX_LENGTH ? { name: `Name must be ${NON_PLAYER_ENTITY_NAME_MAX_LENGTH} characters or fewer.` } : {}
}

/** Pairs each server message with its field by case-insensitive path (ADR 0018). */
export function summaryProblems(state: MythosCreatureFormState, problems: ValidationProblem[]): SummaryProblem[] {
  return summaryProblemsFor(fieldPaths(state), problems)
}

/** The Mythos Creature form's reducer: one handler per action, grouped by section, so no branch grows past the complexity limit. */
export function mythosCreatureFormReducer(state: MythosCreatureFormState, action: MythosCreatureFormAction): MythosCreatureFormState {
  const handler = handlers[action.type] as (current: MythosCreatureFormState, performed: MythosCreatureFormAction) => MythosCreatureFormState
  return handler(state, action)
}

/** What every section's fields need: the state, the reducer's dispatch, and the server's message for a field path. */
export interface SectionFieldsProps {
  state: MythosCreatureFormState
  dispatch: Dispatch<MythosCreatureFormAction>
  errorOf: (path: string) => string | undefined
}
