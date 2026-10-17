import type { SkillRowState } from '@/scenario-preparation/services/humanNpcForm'
import type { SkillCatalog } from '@/campaign-play/types/RuleData'

export type CombatFamily = 'Fighting' | 'Firearms'

/** The Fighting or Firearms family a skill name belongs to, ignoring case; the only skills that take a listed specialization. */
export function combatFamilyOf(skillName: string): CombatFamily | null {
  const name = skillName.trim().toLowerCase()
  if (name === 'fighting') {
    return 'Fighting'
  }
  return name === 'firearms' ? 'Firearms' : null
}

/** The family's specializations from the Era's skill catalog; null while the catalog is unavailable. */
export function specializationsOf(family: CombatFamily, catalog: SkillCatalog | undefined): string[] | null {
  const closed = catalog?.closedFamilies.find((candidate) => candidate.skill.toLowerCase() === family.toLowerCase())
  return closed ? closed.specializations.map((entry) => entry.specialization) : null
}

/** A skill row's name with its specialization, for example "Firearms (Handgun)"; null while it has no name. */
export function skillRowName(row: Pick<SkillRowState, 'name' | 'specialization'>): string | null {
  const name = row.name.trim()
  if (name === '') {
    return null
  }
  const specialization = row.specialization.trim()
  return specialization === '' ? name : `${name} (${specialization})`
}

/** The label of a skill row for buttons and groups: its name, else "skill {n}" (ux.md section 25.4). */
export function skillRowLabel(row: Pick<SkillRowState, 'name' | 'specialization'>, index: number): string {
  return skillRowName(row) ?? `skill ${index + 1}`
}

/** A saved skill's name with its specialization, for example "Firearms (Handgun)". */
export function describeSkill(skill: { name: string | null; specialization: string | null }): string {
  return skill.specialization ? `${skill.name ?? ''} (${skill.specialization})` : (skill.name ?? '')
}
