import type { RequestedRollStatus, RollRequest } from '@/roll-requests/types/RollRequest'

/** The Scene-exit closing counts from the cache: cancelled (Waiting and Pushed) and declined (PushAsked) rolls. */
export interface ClosingRollCounts {
  cancelled: number
  declined: number
}

function isOpen(status: RequestedRollStatus): boolean {
  return status === 'Waiting' || status === 'PushAsked' || status === 'Pushed'
}

function matchingRolls(requests: RollRequest[], investigatorIds: readonly string[] | undefined) {
  const wanted = investigatorIds === undefined ? undefined : new Set(investigatorIds)
  return requests
    .flatMap((request) => request.requestedRolls)
    .filter((roll) => wanted === undefined || wanted.has(roll.investigatorId))
}

/**
 * The number of open Requested Rolls in the Keeper's cached Active Scene requests (specs/roll-requests/ux.md
 * RR-UX-31): the Waiting rolls, the PushAsked rulings, and the Pushed rolls. Unknown while the requests are loading;
 * the server always closes exactly the rolls that are open when the change commits.
 */
export function countKeeperOpenRolls(requests: RollRequest[] | null | undefined): number | undefined {
  if (requests === null || requests === undefined) {
    return undefined
  }

  return matchingRolls(requests, undefined).filter((roll) => isOpen(roll.status)).length
}

/**
 * The Scene-exit closing counts from the cache (specs/scene-play/ux.md section 24): Waiting and Pushed rolls cancel,
 * PushAsked rolls decline. Unknown while the requests are loading; the server always closes exactly the rolls that
 * are open when the change commits.
 */
export function countClosingRolls(
  requests: RollRequest[] | null | undefined,
  investigatorIds?: readonly string[],
): ClosingRollCounts | undefined {
  if (requests === null || requests === undefined) {
    return undefined
  }

  const rolls = matchingRolls(requests, investigatorIds)
  return {
    cancelled: rolls.filter((roll) => roll.status === 'Waiting' || roll.status === 'Pushed').length,
    declined: rolls.filter((roll) => roll.status === 'PushAsked').length,
  }
}

/**
 * The finish-dialog sentence and the start-page hint (specs/scene-play/ux.md section 24, specs/roll-requests/ux.md
 * RR-UX-31): each clause only when its count is above 0, a general warning while unknown, nothing when both are 0.
 */
export function closingRollsSentence(counts: ClosingRollCounts | undefined): string | null {
  if (counts === undefined) {
    return 'Any waiting rolls will be cancelled and any asked pushes declined.'
  }

  const parts: string[] = []
  if (counts.cancelled > 0) {
    parts.push(counts.cancelled === 1 ? '1 waiting roll will be cancelled.' : `${counts.cancelled} waiting rolls will be cancelled.`)
  }
  if (counts.declined > 0) {
    parts.push(counts.declined === 1 ? '1 push will be declined.' : `${counts.declined} pushes will be declined.`)
  }

  return parts.length === 0 ? null : parts.join(' ')
}

/** The present-save report (SPL-UX-71, SPL-UX-72): the plain sentence stays with the caller when nothing closed. */
export function presentSavedReport(counts: ClosingRollCounts): string {
  const parts = ['Investigators present saved.']
  if (counts.cancelled > 0) {
    parts.push(counts.cancelled === 1 ? '1 waiting roll cancelled.' : `${counts.cancelled} waiting rolls cancelled.`)
  }
  if (counts.declined > 0) {
    parts.push(counts.declined === 1 ? '1 push declined.' : `${counts.declined} pushes declined.`)
  }

  return parts.join(' ')
}
