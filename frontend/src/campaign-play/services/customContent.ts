import type { CharacterSheetView } from '@/campaign-play/types/CharacterSheet'

/**
 * The custom content the Keeper judges at Character Approval, as "Worth checking" lines (specs/character-sheet/ux.md
 * section 7.1): a custom Occupation and the Custom Weapons (docs/game-rules project_ruleset.md section 4.2).
 */
export function customContentNotes(sheet: CharacterSheetView): string[] {
  const notes: string[] = []
  if (sheet.occupation?.isCustom) {
    notes.push(`Custom occupation: ${sheet.occupation.name ?? sheet.occupation.custom?.name ?? 'Unnamed'}`)
  }

  const customWeapons = sheet.weapons.filter((weapon) => weapon.isCustom).length
  if (customWeapons > 0) {
    notes.push(customWeapons === 1 ? '1 custom weapon' : `${customWeapons} custom weapons`)
  }

  return notes
}
