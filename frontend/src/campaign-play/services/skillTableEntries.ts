import { occupationSkillsOf } from '@/campaign-play/services/occupationSkills'
import { familyOf, skillBaseOf } from '@/campaign-play/services/skillBases'
import { skillDisplayName } from '@/campaign-play/services/skillValidation'
import { sameSkill } from '@/campaign-play/state/characterSheetForm'
import {
  CHARACTERISTIC_CODES,
  type CharacterSheetInputs,
  type CharacterSheetView,
  type CharacteristicInputs,
  type SkillReference,
} from '@/campaign-play/types/CharacterSheet'
import type { OccupationCatalog, SkillCatalog } from '@/campaign-play/types/RuleData'

export interface SkillTableEntry {
  skill: SkillReference
  base: number | null
  isOccupationSkill: boolean
}

function finalValues(sheet: CharacterSheetView): CharacteristicInputs {
  return Object.fromEntries(CHARACTERISTIC_CODES.map((code) => [code, sheet.characteristics[code].value]))
}

/**
 * The skills a skill table lists: the saved rows (without the unspecialized family rows, which take specializations
 * through "Add another specialization"), then the occupation skills, allocations, Quick fire skills, and added
 * specializations not saved yet. Bases of unsaved rows are worked out for display only.
 */
export function skillTableEntries(
  sheet: CharacterSheetView,
  inputs: CharacterSheetInputs,
  skillCatalog: SkillCatalog,
  occupationCatalog: OccupationCatalog,
  added: SkillReference[],
): SkillTableEntry[] {
  const occupationSkills = occupationSkillsOf(inputs.occupation, occupationCatalog)
  const saved = sheet.skills.filter((row) => row.specialization !== null || familyOf(row.skill, skillCatalog) === 'none')
  const candidates: SkillReference[] = [
    ...saved,
    ...occupationSkills,
    ...inputs.skills,
    ...inputs.quickFire.values,
    ...inputs.quickFire.personalInterests,
    ...added,
  ]
  const values = finalValues(sheet)

  const entries: SkillTableEntry[] = []
  for (const candidate of candidates) {
    if (candidate.skill === '' || entries.some((entry) => sameSkill(entry.skill, candidate))) {
      continue
    }

    const skill = { skill: candidate.skill, specialization: candidate.specialization }
    const savedRow = saved.find((row) => sameSkill(row, skill))
    entries.push({
      skill,
      base: savedRow ? savedRow.base : skillBaseOf(skill, skillCatalog, values),
      isOccupationSkill: occupationSkills.some((occupationSkill) => sameSkill(occupationSkill, skill)),
    })
  }
  return entries
}

/**
 * A skill's value: base plus its points (docs/game-rules section 9), or with Quick fire its assigned value, or base
 * plus the personal interest bonus (section 18). Null until the base is known. Display only.
 */
export function skillTotal(base: number | null, inputs: CharacterSheetInputs, skill: SkillReference, interestBonus: number): number | null {
  if (inputs.creationMethod === 'QuickFire') {
    const assigned = inputs.quickFire.values.find((value) => sameSkill(value, skill))?.value ?? null
    if (assigned !== null) {
      return assigned
    }

    const interest = inputs.quickFire.personalInterests.some((candidate) => sameSkill(candidate, skill))
    return base === null ? null : base + (interest ? interestBonus : 0)
  }

  const allocation = inputs.skills.find((candidate) => sameSkill(candidate, skill))
  return base === null ? null : base + (allocation?.occupationPoints ?? 0) + (allocation?.personalInterestPoints ?? 0)
}

/** The field of a skill row's points: the allocation's index once it exists, otherwise a stand-in for its control id. */
export function pointsField(inputs: CharacterSheetInputs, skill: SkillReference, column: 'occupationPoints' | 'personalInterestPoints'): string {
  const index = inputs.skills.findIndex((candidate) => sameSkill(candidate, skill))
  return index >= 0 ? `skills[${index}].${column}` : `skillRows.${skillDisplayName(skill.skill, skill.specialization)}.${column}`
}
