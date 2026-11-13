import { CHARACTERISTIC_CODES, ROLL_GROUPS, type RollGroup, type RollRecord } from '@/campaign-play/types/CharacterSheet'

const CHARACTERISTIC_PURPOSES = new Set(CHARACTERISTIC_CODES.map((code) => `Characteristic:${code}`))

/** The re-roll group a Roll Record purpose belongs to, or null for a purpose no grant covers. */
export function rollGroupOf(purpose: string): RollGroup | null {
  if (CHARACTERISTIC_PURPOSES.has(purpose)) {
    return 'Characteristics'
  }

  if (purpose === 'Luck' || purpose === 'Luck:SecondRoll') {
    return 'Luck'
  }

  if (/^EduImprovement\[\d+\]\.(Check|Gain)$/.test(purpose)) {
    return 'EduImprovementChecks'
  }

  return null
}

/**
 * The groups the Request changes dialog may offer (specs/character-sheet/ux.md section 7.1): every group with a
 * current (not replaced) Roll Record, in grant order.
 */
export function grantableGroups(rollRecords: RollRecord[]): RollGroup[] {
  const current = new Set(
    rollRecords.filter((record) => !record.isReplaced).map((record) => rollGroupOf(record.purpose)),
  )
  return ROLL_GROUPS.filter((group) => current.has(group))
}

const DISPLAY_NAMES: Record<RollGroup, string> = {
  Characteristics: 'characteristics',
  Luck: 'Luck',
  EduImprovementChecks: 'EDU checks',
}

/** "characteristics, EDU checks": the Keeper comment grant line names (ux.md section 6.8, U3). */
export function displayGrantedGroups(grants: RollGroup[]): string {
  return [...grants].sort((left, right) => ROLL_GROUPS.indexOf(left) - ROLL_GROUPS.indexOf(right)).map((grant) => DISPLAY_NAMES[grant]).join(', ')
}
