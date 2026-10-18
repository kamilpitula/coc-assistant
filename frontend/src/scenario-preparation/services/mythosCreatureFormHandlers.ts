import { addRowButtonId, addSectionButtonId, controlIdFor, focusAfterRemoval, MAX_ROWS, replaceAt, rowPath } from '@/scenario-preparation/services/profileForm'
import type {
  CharacteristicsState,
  MythosCreatureFormAction,
  MythosCreatureFormState,
} from '@/scenario-preparation/services/mythosCreatureForm'
import { SECTION_LABELS, type SectionName } from '@/scenario-preparation/services/mythosCreatureSections'

type State = MythosCreatureFormState
type Action = MythosCreatureFormAction
type Handler<K extends Action['type']> = (state: State, action: Extract<Action, { type: K }>) => State
type Group<Keys extends Action['type']> = { [K in Keys]: Handler<K> }

const SECTION_INITIAL: { [S in SectionName]: Partial<State> } = {
  characteristics: {
    characteristics: {
      values: { STR: null, CON: null, SIZ: null, DEX: null, INT: null, POW: null, APP: null, EDU: null },
      extraShown: { APP: false, EDU: false },
      hitPointsMode: 'computed',
      hitPoints: { value: null, reason: '' },
      magicPoints: null,
      damageBonus: null,
      build: null,
    },
  },
  movement: { movement: [] },
  combat: { combat: { attacksPerRound: null, dodge: null, attacks: [] } },
  defenses: { defenses: { armorPoints: null, armorNote: '', immunities: [], vulnerabilities: [] } },
  skills: { skills: [] },
  spells: { spells: [] },
  powers: { powers: [] },
  sanityLoss: { sanityLoss: '' },
}

const SECTION_FIRST_CONTROL: Record<SectionName, string> = {
  characteristics: controlIdFor('characteristics.values.STR'),
  movement: addRowButtonId('movement'),
  combat: controlIdFor('combat.attacksPerRound'),
  defenses: controlIdFor('defenses.armorPoints'),
  skills: addRowButtonId('skills'),
  spells: addRowButtonId('spells'),
  powers: addRowButtonId('powers'),
  sanityLoss: controlIdFor('sanityLoss.value'),
}

const removeAt = <T>(rows: T[], index: number): T[] => rows.filter((_, position) => position !== index)

/** The first field of every row of a repeating list, for the focus rules after adding and removing. */
const firstFieldId = (list: string, index: number, field: string): string => controlIdFor(rowPath(list, index, field))

const withCharacteristics = (state: State, change: (characteristics: CharacteristicsState) => Partial<CharacteristicsState>): State =>
  state.characteristics ? { ...state, characteristics: { ...state.characteristics, ...change(state.characteristics) } } : state

const withCombat = (state: State, change: (combat: NonNullable<State['combat']>) => Partial<NonNullable<State['combat']>>): State =>
  state.combat ? { ...state, combat: { ...state.combat, ...change(state.combat) } } : state

const withDefenses = (state: State, change: (defenses: NonNullable<State['defenses']>) => Partial<NonNullable<State['defenses']>>): State =>
  state.defenses ? { ...state, defenses: { ...state.defenses, ...change(state.defenses) } } : state

const coreHandlers: Group<'setName' | 'setCreatureKind' | 'setDetail' | 'addSection' | 'removeSection' | 'clearFocus'> = {
  setName: (state, action) => ({ ...state, name: action.value }),
  setCreatureKind: (state, action) => ({ ...state, creatureKind: action.value }),
  setDetail: (state, action) => ({ ...state, details: { ...state.details, [action.key]: action.value } }),
  addSection: (state, action) => ({
    ...state,
    ...SECTION_INITIAL[action.section],
    focusTarget: SECTION_FIRST_CONTROL[action.section],
    announcement: `${SECTION_LABELS[action.section]} section added.`,
  }),
  removeSection: (state, action) => ({
    ...state,
    [action.section]: null,
    focusTarget: addSectionButtonId(action.section),
    announcement: `${SECTION_LABELS[action.section]} section removed.`,
  }),
  clearFocus: (state) => ({ ...state, focusTarget: null }),
}

const characteristicsHandlers: Group<
  | 'setCharacteristic'
  | 'showCharacteristic'
  | 'setHitPointsMode'
  | 'setOverrideEnabled'
  | 'setOverrideNumber'
  | 'setDamageBonusOverride'
  | 'setOverrideReason'
> = {
  setCharacteristic: (state, action) =>
    withCharacteristics(state, (characteristics) => ({ values: { ...characteristics.values, [action.code]: action.value } })),
  showCharacteristic: (state, action) => ({
    ...withCharacteristics(state, (characteristics) => ({ extraShown: { ...characteristics.extraShown, [action.code]: true } })),
    focusTarget: state.characteristics ? controlIdFor(`characteristics.values.${action.code}`) : state.focusTarget,
  }),
  // Choosing another Hit Points option drops the override's value and reason (ux.md section 25.5).
  setHitPointsMode: (state, action) => ({
    ...withCharacteristics(state, () => ({ hitPointsMode: action.mode, hitPoints: { value: null, reason: '' } })),
    focusTarget: state.characteristics && action.mode === 'override' ? controlIdFor('characteristics.overrides.hitPoints.value') : state.focusTarget,
  }),
  setOverrideEnabled: (state, action) => ({
    ...withCharacteristics(state, () => ({ [action.override]: action.enabled ? (action.override === 'damageBonus' ? { value: '', reason: '' } : { value: null, reason: '' }) : null })),
    focusTarget: state.characteristics && action.enabled ? controlIdFor(`characteristics.overrides.${action.override}.value`) : state.focusTarget,
  }),
  setOverrideNumber: (state, action) =>
    withCharacteristics(state, (characteristics) => ({ [action.override]: { ...characteristics[action.override], value: action.value } })),
  setDamageBonusOverride: (state, action) =>
    withCharacteristics(state, (characteristics) => (characteristics.damageBonus ? { damageBonus: { ...characteristics.damageBonus, value: action.value } } : {})),
  setOverrideReason: (state, action) =>
    withCharacteristics(state, (characteristics) => {
      const current = characteristics[action.override]
      return current ? { [action.override]: { ...current, reason: action.value } } : {}
    }),
}

const movementHandlers: Group<'addMovement' | 'removeMovement' | 'setMovementMode' | 'setMovementLabel' | 'setMovementRate'> = {
  addMovement: (state) =>
    !state.movement || state.movement.length >= MAX_ROWS
      ? state
      : {
          ...state,
          movement: [...state.movement, { key: state.nextKey, mode: 'Walk', label: '', rate: null }],
          nextKey: state.nextKey + 1,
          focusTarget: firstFieldId('movement', state.movement.length, 'mode'),
        },
  removeMovement: (state, action) => {
    const movement = removeAt(state.movement ?? [], action.index)
    return { ...state, movement, focusTarget: focusAfterRemoval('movement', movement.length, action.index, 'mode', addRowButtonId('movement')) }
  },
  setMovementMode: (state, action) => (state.movement ? { ...state, movement: replaceAt(state.movement, action.index, { mode: action.mode }) } : state),
  setMovementLabel: (state, action) => (state.movement ? { ...state, movement: replaceAt(state.movement, action.index, { label: action.value }) } : state),
  setMovementRate: (state, action) => (state.movement ? { ...state, movement: replaceAt(state.movement, action.index, { rate: action.value }) } : state),
}

const combatHandlers: Group<
  'setAttacksPerRound' | 'setDodge' | 'addAttack' | 'removeAttack' | 'setAttackText' | 'setAttackValue' | 'setAttackManoeuvre'
> = {
  setAttacksPerRound: (state, action) => withCombat(state, () => ({ attacksPerRound: action.value })),
  setDodge: (state, action) => withCombat(state, () => ({ dodge: action.value })),
  addAttack: (state) =>
    !state.combat || state.combat.attacks.length >= MAX_ROWS
      ? state
      : {
          ...withCombat(state, (combat) => ({
            attacks: [...combat.attacks, { key: state.nextKey, name: '', skill: 'Fighting', skillValue: null, damage: '', effect: '', manoeuvre: false }],
          })),
          nextKey: state.nextKey + 1,
          focusTarget: firstFieldId('combat.attacks', state.combat.attacks.length, 'name'),
        },
  removeAttack: (state, action) => {
    const attacks = removeAt(state.combat?.attacks ?? [], action.index)
    return {
      ...withCombat(state, () => ({ attacks })),
      focusTarget: focusAfterRemoval('combat.attacks', attacks.length, action.index, 'name', addRowButtonId('combat.attacks')),
    }
  },
  setAttackText: (state, action) =>
    withCombat(state, (combat) => ({ attacks: replaceAt(combat.attacks, action.index, { [action.field]: action.value }) })),
  setAttackValue: (state, action) =>
    withCombat(state, (combat) => ({ attacks: replaceAt(combat.attacks, action.index, { skillValue: action.value }) })),
  setAttackManoeuvre: (state, action) =>
    withCombat(state, (combat) => ({ attacks: replaceAt(combat.attacks, action.index, { manoeuvre: action.value }) })),
}

const defensesHandlers: Group<'setArmorPoints' | 'setArmorNote' | 'addDefenseEntry' | 'removeDefenseEntry' | 'setDefenseEntry'> = {
  setArmorPoints: (state, action) => withDefenses(state, () => ({ armorPoints: action.value })),
  setArmorNote: (state, action) => withDefenses(state, () => ({ armorNote: action.value })),
  addDefenseEntry: (state, action) => {
    const current = state.defenses?.[action.list] ?? []
    if (!state.defenses || current.length >= MAX_ROWS) {
      return state
    }
    return {
      ...withDefenses(state, () => ({ [action.list]: [...current, { key: state.nextKey, description: '' }] })),
      nextKey: state.nextKey + 1,
      focusTarget: firstFieldId(`defenses.${action.list}`, current.length, 'description'),
    }
  },
  removeDefenseEntry: (state, action) => {
    const remaining = removeAt(state.defenses?.[action.list] ?? [], action.index)
    return {
      ...withDefenses(state, () => ({ [action.list]: remaining })),
      focusTarget: focusAfterRemoval(`defenses.${action.list}`, remaining.length, action.index, 'description', addRowButtonId(`defenses.${action.list}`)),
    }
  },
  setDefenseEntry: (state, action) =>
    withDefenses(state, (defenses) => ({ [action.list]: replaceAt(defenses[action.list], action.index, { description: action.value }) })),
}

const skillHandlers: Group<'addSkill' | 'removeSkill' | 'setSkillName' | 'setSkillValue'> = {
  addSkill: (state) =>
    !state.skills || state.skills.length >= MAX_ROWS
      ? state
      : {
          ...state,
          skills: [...state.skills, { key: state.nextKey, name: '', value: null }],
          nextKey: state.nextKey + 1,
          focusTarget: firstFieldId('skills', state.skills.length, 'name'),
        },
  removeSkill: (state, action) => {
    const skills = removeAt(state.skills ?? [], action.index)
    return { ...state, skills, focusTarget: focusAfterRemoval('skills', skills.length, action.index, 'name', addRowButtonId('skills')) }
  },
  setSkillName: (state, action) => (state.skills ? { ...state, skills: replaceAt(state.skills, action.index, { name: action.value }) } : state),
  setSkillValue: (state, action) => (state.skills ? { ...state, skills: replaceAt(state.skills, action.index, { value: action.value }) } : state),
}

const spellHandlers: Group<'addSpell' | 'removeSpell' | 'setSpellText' | 'addPower' | 'removePower' | 'setPowerText'> = {
  addSpell: (state) =>
    !state.spells || state.spells.length >= MAX_ROWS
      ? state
      : {
          ...state,
          spells: [...state.spells, { key: state.nextKey, name: '', magicPointCost: '', effect: '' }],
          nextKey: state.nextKey + 1,
          focusTarget: firstFieldId('spells', state.spells.length, 'name'),
        },
  removeSpell: (state, action) => {
    const spells = removeAt(state.spells ?? [], action.index)
    return { ...state, spells, focusTarget: focusAfterRemoval('spells', spells.length, action.index, 'name', addRowButtonId('spells')) }
  },
  setSpellText: (state, action) => (state.spells ? { ...state, spells: replaceAt(state.spells, action.index, { [action.field]: action.value }) } : state),
  addPower: (state) =>
    !state.powers || state.powers.length >= MAX_ROWS
      ? state
      : {
          ...state,
          powers: [...state.powers, { key: state.nextKey, name: '', magicPointCost: '', effect: '', limits: '' }],
          nextKey: state.nextKey + 1,
          focusTarget: firstFieldId('powers', state.powers.length, 'name'),
        },
  removePower: (state, action) => {
    const powers = removeAt(state.powers ?? [], action.index)
    return { ...state, powers, focusTarget: focusAfterRemoval('powers', powers.length, action.index, 'name', addRowButtonId('powers')) }
  },
  setPowerText: (state, action) => (state.powers ? { ...state, powers: replaceAt(state.powers, action.index, { [action.field]: action.value }) } : state),
}

const sanityLossHandlers: Group<'setSanityLoss'> = {
  setSanityLoss: (state, action) => (state.sanityLoss === null ? state : { ...state, sanityLoss: action.value }),
}

/** One handler per action, grouped by section; the form's reducer looks the action up here. */
export const handlers: { [K in Action['type']]: Handler<K> } = {
  ...coreHandlers,
  ...characteristicsHandlers,
  ...movementHandlers,
  ...combatHandlers,
  ...defensesHandlers,
  ...skillHandlers,
  ...spellHandlers,
  ...sanityLossHandlers,
}
