import type { CharacteristicInputs, SkillReference } from '@/campaign-play/types/CharacterSheet'
import type { SkillBase, SkillCatalog } from '@/campaign-play/types/RuleData'

export type SkillFamily = 'closed' | 'open' | 'none'

function same(first: string, second: string): boolean {
  return first.localeCompare(second, undefined, { sensitivity: 'accent' }) === 0
}

/** Whether a skill takes a specialization from a list (closed), any specialization (open), or none (project_ruleset.md 4.2). */
export function familyOf(skill: string, catalog: SkillCatalog): SkillFamily {
  if (catalog.closedFamilies.some((family) => same(family.skill, skill))) {
    return 'closed'
  }

  return catalog.openFamilies.some((family) => same(family, skill)) ? 'open' : 'none'
}

function valueOf(base: SkillBase, values: CharacteristicInputs): number | null {
  if (base.kind === 'fixed') {
    return base.value ?? null
  }

  const value = values[base.characteristic as keyof CharacteristicInputs]
  return value === null || value === undefined ? null : Math.floor(value / (base.divisor ?? 1))
}

/**
 * A skill's base value (docs/game-rules sections 6.1 and 6.2) for the characteristic values after age effects, or
 * null when it is unknown. Display only, for rows the server has not computed yet.
 */
export function skillBaseOf(skill: SkillReference, catalog: SkillCatalog, values: CharacteristicInputs): number | null {
  const family = familyOf(skill.skill, catalog)
  if (family === 'closed') {
    const entry = catalog.closedFamilies
      .find((candidate) => same(candidate.skill, skill.skill))
      ?.specializations.find((candidate) => skill.specialization !== null && same(candidate.specialization, skill.specialization))
    return entry ? valueOf(entry.base, values) : null
  }

  const name = family === 'open' ? { skill: skill.skill, specialization: null } : skill
  const definition = catalog.skills.find(
    (candidate) => same(candidate.skill, name.skill) && (candidate.specialization ?? null) === (name.specialization ?? null),
  )
  return definition ? valueOf(definition.base, values) : null
}

/** Every skill name a skill picker offers: the catalog's plain skills and each specialized family once. */
export function skillNames(catalog: SkillCatalog): string[] {
  const names = new Set<string>()
  for (const definition of catalog.skills) {
    names.add(definition.skill)
  }
  for (const family of catalog.closedFamilies) {
    names.add(family.skill)
  }
  return [...names].sort((first, second) => first.localeCompare(second))
}
