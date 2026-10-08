import { skillDisplayName } from '@/campaign-play/services/skillValidation'
import type { CharacteristicInputs, OccupationInputs, OccupationPointTerm, SkillReference } from '@/campaign-play/types/CharacterSheet'
import type { CatalogOccupation, OccupationCatalog, OccupationSkillSlot } from '@/campaign-play/types/RuleData'

/** A slot naming a skill with this specialization takes the Player's specialization. */
const ANY_SPECIALIZATION = 'any'

/** An occupation skill slot the Player fills in: how many picks it needs and what it offers (null: any skill). */
export interface OpenSlot {
  index: number
  needed: number
  label: string
  options: SkillReference[] | null
  /** True for a skill with any specialization: the Player picks only the specialization. */
  specializationOnly: boolean
}

function referenceOf(slot: OccupationSkillSlot): SkillReference {
  return { skill: slot.skill ?? '', specialization: slot.specialization && slot.specialization !== ANY_SPECIALIZATION ? slot.specialization : null }
}

function isFixed(slot: OccupationSkillSlot): boolean {
  return slot.kind === 'skill' && slot.specialization !== ANY_SPECIALIZATION
}

function openSlot(slot: OccupationSkillSlot, index: number, catalog: OccupationCatalog): OpenSlot {
  const needed = slot.choose ?? 1
  switch (slot.kind) {
    case 'skill':
      return { index, needed: 1, label: `${slot.skill} specialization`, options: [referenceOf(slot)], specializationOnly: true }
    case 'group':
      return {
        index,
        needed,
        label: `Choose ${needed} ${slot.group} ${needed === 1 ? 'skill' : 'skills'}`,
        options: (catalog.skillGroups[slot.group ?? ''] ?? []).map(referenceOf),
        specializationOnly: false,
      }
    case 'choice': {
      const options = (slot.from ?? []).map(referenceOf)
      const names = options.map((option) => skillDisplayName(option.skill, option.specialization))
      return { index, needed, label: `Choose ${needed}: ${names.join(' or ')}`, options, specializationOnly: false }
    }
    default:
      return { index, needed, label: `Choose ${needed} ${needed === 1 ? 'skill' : 'skills'} of your choice`, options: null, specializationOnly: false }
  }
}

/** The slots of a catalog Occupation the Player fills in (docs/game-rules section 7.2). */
export function openSlotsOf(occupation: CatalogOccupation, catalog: OccupationCatalog): OpenSlot[] {
  return occupation.skillSlots.flatMap((slot, index) => (isFixed(slot) ? [] : [openSlot(slot, index, catalog)]))
}

/** The selected catalog Occupation, or null for a custom one or none. */
export function selectedCatalogOccupation(occupation: OccupationInputs | null, catalog: OccupationCatalog): CatalogOccupation | null {
  return catalog.occupations.find((candidate) => candidate.id === occupation?.catalogId) ?? null
}

/**
 * The occupation skills: the fixed skills and the picks of a catalog Occupation, or a custom Occupation's chosen skills
 * (docs/game-rules section 7.2). The wizard uses them for display; the server resolves the real ones.
 */
export function occupationSkillsOf(occupation: OccupationInputs | null, catalog: OccupationCatalog): SkillReference[] {
  const selected = selectedCatalogOccupation(occupation, catalog)
  if (selected === null) {
    return (occupation?.custom?.skills ?? []).filter((candidate): candidate is SkillReference => candidate !== null)
  }

  return selected.skillSlots.flatMap((slot, index) =>
    isFixed(slot) ? [referenceOf(slot)] : (occupation?.skillChoices[index] ?? []).slice(0, slot.choose ?? 1),
  )
}

/**
 * The occupation points of a formula for these characteristic values (docs/game-rules section 7.1), using the pick for
 * a term that offers several characteristics; null until every value and pick is known. Display only.
 */
export function formulaPoints(terms: OccupationPointTerm[], values: CharacteristicInputs, picks: (string | null)[]): number | null {
  let total = 0
  for (const [index, term] of terms.entries()) {
    const code = term.characteristics.length === 1 ? term.characteristics[0] : term.characteristics.find((candidate) => candidate === picks[index])
    const value = code === undefined ? undefined : values[code as keyof CharacteristicInputs]
    if (value === null || value === undefined) {
      return null
    }
    total += value * term.multiplier
  }
  return total
}

/** A row of "2. Assign values": a chosen occupation skill, or a slot still to choose named after it (ux.md 6.5). */
export type OccupationRow = { kind: 'skill'; skill: SkillReference } | { kind: 'unchosen'; label: string }

function slotRows(slot: OccupationSkillSlot, index: number, picks: SkillReference[], catalog: OccupationCatalog): OccupationRow[] {
  if (isFixed(slot)) {
    return [{ kind: 'skill', skill: referenceOf(slot) }]
  }

  const open = openSlot(slot, index, catalog)
  return Array.from({ length: open.needed }, (_, pick): OccupationRow => {
    const chosen = picks[pick]
    const complete = chosen !== undefined && (!open.specializationOnly || chosen.specialization !== null)
    return complete ? { kind: 'skill', skill: chosen } : { kind: 'unchosen', label: open.needed === 1 ? open.label : `${open.label}, pick ${pick + 1}` }
  })
}

/**
 * The occupation skill rows in a stable order: a catalog Occupation's slots in catalog order, or a custom Occupation's
 * numbered skills, so rows never reorder after a save (specs/character-sheet/ux.md section 6.5).
 */
export function occupationRowsOf(occupation: OccupationInputs | null, catalog: OccupationCatalog, customSkillCount: number): OccupationRow[] {
  const selected = selectedCatalogOccupation(occupation, catalog)
  if (selected) {
    return selected.skillSlots.flatMap((slot, index) => slotRows(slot, index, occupation?.skillChoices[index] ?? [], catalog))
  }

  if (!occupation?.custom) {
    return []
  }

  return Array.from({ length: customSkillCount }, (_, index): OccupationRow => {
    const chosen = occupation.custom?.skills[index] ?? null
    return chosen ? { kind: 'skill', skill: chosen } : { kind: 'unchosen', label: `Occupation skill ${index + 1}` }
  })
}
