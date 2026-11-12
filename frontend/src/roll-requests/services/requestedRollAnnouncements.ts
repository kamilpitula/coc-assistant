import { rollTargetName } from '@/roll-requests/services/rollRequestPresentation'
import type { WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'

function rollKey(roll: WaitingRequestedRoll): string {
  return `${roll.rollRequestId}:${roll.roll.investigatorId}`
}

/**
 * The rolls that arrived between two fetched waiting lists (specs/roll-requests/ux.md section 8): not in the previous
 * list. Nothing is new before a previous list exists; after the first fetched list, the first fetch is the baseline.
 * Rolls that leave the list (results, already-made rolls) are never new.
 */
export function findNewRequestedRolls(
  previous: readonly WaitingRequestedRoll[] | undefined,
  next: readonly WaitingRequestedRoll[],
): WaitingRequestedRoll[] {
  if (previous === undefined) {
    return []
  }

  const known = new Set(previous.map(rollKey))
  return next.filter((roll) => !known.has(rollKey(roll)))
}

/** The assertive announcement for rolls that arrived together; empty for none (specs/roll-requests/ux.md section 8). */
export function describeNewRequestedRolls(
  rolls: readonly WaitingRequestedRoll[],
  investigatorName: string,
  onActiveScenePage: boolean,
): string {
  if (rolls.length === 0) {
    return ''
  }

  if (rolls.length === 1) {
    const direction = onActiveScenePage ? '' : ' Roll it on the Active Scene.'
    return `Roll requested for ${investigatorName}: ${rollTargetName(rolls[0].target)}.${direction}`
  }

  const direction = onActiveScenePage ? '' : ' Roll them on the Active Scene.'
  return `${rolls.length} rolls requested for ${investigatorName}.${direction}`
}
