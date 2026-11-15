import type { RequestedRoll } from '@/roll-requests/types/RollRequest'

/**
 * The client push state of a Requested Roll (specs/roll-requests/ux.md section 19.3): the card and the Scene History
 * rows render from this, never from the status alone.
 */
export type RequestedRollPushState =
  | 'Waiting'
  | 'Rolled'
  | 'PushAsked'
  | 'Pushed'
  | 'PushedRolled'
  | 'PushDeclined'
  | 'Cancelled'
  | 'CancelledAfterPush'

export function requestedRollPushState(roll: RequestedRoll): RequestedRollPushState {
  if (roll.status === 'Waiting') {
    return 'Waiting'
  }

  if (roll.status === 'PushAsked') {
    return 'PushAsked'
  }

  if (roll.status === 'Pushed') {
    return 'Pushed'
  }

  if (roll.status === 'Cancelled') {
    return roll.rolls.length > 0 ? 'CancelledAfterPush' : 'Cancelled'
  }

  if (roll.pushJustification !== null) {
    return roll.rolls.length > 1 ? 'PushedRolled' : 'PushDeclined'
  }

  return 'Rolled'
}
