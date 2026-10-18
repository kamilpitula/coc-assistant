export type SectionName = 'characteristics' | 'movement' | 'combat' | 'defenses' | 'skills' | 'spells' | 'powers' | 'sanityLoss'

/** The optional sections in their fixed order (specs/scenario-preparation/ux.md section 25.5). */
export const SECTION_ORDER: SectionName[] = ['characteristics', 'movement', 'combat', 'defenses', 'skills', 'spells', 'powers', 'sanityLoss']

export const SECTION_LABELS: Record<SectionName, string> = {
  characteristics: 'Characteristics',
  movement: 'Movement',
  combat: 'Combat',
  defenses: 'Defenses',
  skills: 'Skills',
  spells: 'Spells',
  powers: 'Powers',
  sanityLoss: 'Sanity loss',
}

/** The id of a section's `section` (view) or `fieldset` (edit), the focus target of its link in the section index. */
export const sectionAnchorId = (section: SectionName | 'details' | 'keeperNotes'): string => `section-${section === 'keeperNotes' ? 'keeper-notes' : section}`

export interface SectionIndexEntry {
  id: string
  label: string
}

/** The section index (SP-UX-45): Details, each present section in the fixed order, and Keeper notes. */
export function sectionIndexEntries(present: SectionName[]): SectionIndexEntry[] {
  return [
    { id: sectionAnchorId('details'), label: 'Details' },
    ...SECTION_ORDER.filter((section) => present.includes(section)).map((section) => ({ id: sectionAnchorId(section), label: SECTION_LABELS[section] })),
    { id: sectionAnchorId('keeperNotes'), label: 'Keeper notes' },
  ]
}
