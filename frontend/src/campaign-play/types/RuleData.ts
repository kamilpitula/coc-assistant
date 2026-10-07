import type { OccupationPointTerm } from '@/campaign-play/types/CharacterSheet'

/**
 * Era rule data served to Campaign members (specs/character-sheet/spec.md, API Contracts): the Occupation catalog
 * (docs/game-rules/catalogs/occupations.1920s.json) and the skills (catalogs/skills.1920s.json and
 * catalogs/skill-specializations.json).
 */

/** An occupation skill slot, as named in the Occupation catalog. */
export interface OccupationSkillSlot {
  kind: 'skill' | 'group' | 'any' | 'choice'
  skill?: string
  specialization?: string
  choose?: number
  group?: string
  from?: OccupationSkillSlot[]
}

export interface CatalogOccupation {
  id: string
  name: string
  creditRatingMin: number
  creditRatingMax: number
  occupationPointFormula: { terms: OccupationPointTerm[] }
  skillSlots: OccupationSkillSlot[]
}

export interface OccupationCatalog {
  era: string
  skillGroups: Record<string, OccupationSkillSlot[]>
  occupations: CatalogOccupation[]
}

export interface SkillBase {
  kind: 'fixed' | 'characteristic'
  value?: number
  characteristic?: string
  divisor?: number
}

export interface SkillDefinition {
  skill: string
  specialization: string | null
  base: SkillBase
}

export interface SkillCatalog {
  era: string
  skills: SkillDefinition[]
  closedFamilies: { skill: string; specializations: { specialization: string; base: SkillBase }[] }[]
  openFamilies: string[]
  specializationSuggestions: Record<string, string[]>
}
