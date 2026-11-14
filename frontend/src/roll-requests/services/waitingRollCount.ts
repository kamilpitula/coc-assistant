import type { RollRequest } from '@/roll-requests/types/RollRequest'

/**
 * The number of Waiting Requested Rolls in the Keeper's cached Active Scene requests (specs/scene-play/ux.md
 * section 24): the badge, the finish dialog, the start page hint, and the present report all read it. Unknown while
 * the requests are loading; the server always cancels exactly the rolls that are Waiting when the change commits.
 */
export function countWaitingRolls(
  requests: RollRequest[] | null | undefined,
  investigatorIds?: readonly string[],
): number | undefined {
  if (requests === null || requests === undefined) {
    return undefined
  }

  const waiting = requests.flatMap((request) => request.requestedRolls).filter((roll) => roll.status === 'Waiting')
  if (investigatorIds === undefined) {
    return waiting.length
  }

  const wanted = new Set(investigatorIds)
  return waiting.filter((roll) => wanted.has(roll.investigatorId)).length
}

/**
 * The finish-dialog sentence and the start-page hint (SPL-UX-70, SPL-UX-72): the count, or a general warning while it
 * is unknown, or nothing when no roll waits.
 */
export function waitingRollsToCancelSentence(count: number | undefined): string | null {
  if (count === undefined) {
    return 'Any waiting rolls will be cancelled.'
  }

  if (count === 0) {
    return null
  }

  return count === 1 ? '1 waiting roll will be cancelled.' : `${count} waiting rolls will be cancelled.`
}

/** The present-save report (SPL-UX-71): the plain sentence stays with the caller when nothing was cancelled. */
export function cancelledRollsReport(count: number): string {
  return count === 1
    ? 'Investigators present saved. 1 waiting roll cancelled.'
    : `Investigators present saved. ${count} waiting rolls cancelled.`
}
