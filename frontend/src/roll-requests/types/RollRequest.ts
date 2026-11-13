/** A Roll Request's target: a skill (with an optional specialization), a characteristic by code, or Luck. */
export interface RollRequestTarget {
  kind: 'Skill' | 'Characteristic' | 'Luck'
  skill: string | null
  specialization: string | null
  characteristic: string | null
}

/** A resolved percentile roll: the kept tens die, the read result, and its Success Level. */
export interface PercentileOutcome {
  unitsFace: number
  tensFaces: number[]
  keptTens: number
  result: number
  successLevel: 'Fumble' | 'Failure' | 'Regular' | 'Hard' | 'Extreme' | 'Critical'
  isSuccess: boolean
}

/** One rolled result: the dice, the faces, who rolled by display name, when, and the percentile resolution. */
export interface CompletedRoll {
  dice: string
  result: number
  faces: number[] | null
  rolledBy: string | null
  rolledAt: string | null
  percentile: PercentileOutcome | null
  earnsExperienceCheck: boolean | null
}

export const REQUESTED_ROLL_STATUSES = ['Waiting', 'Rolled'] as const

export type RequestedRollStatus = (typeof REQUESTED_ROLL_STATUSES)[number]

/** One Requested Roll: the snapshot target value, the effective Difficulty and dice, the status, and the result once rolled. */
export interface RequestedRoll {
  investigatorId: string
  investigatorName: string | null
  targetValue: number
  usesBaseValue: boolean
  canEarnExperienceCheck: boolean
  difficulty: 'Regular' | 'Hard' | 'Extreme'
  bonusDice: number
  penaltyDice: number
  status: RequestedRollStatus
  rolls: CompletedRoll[]
}

/** A Roll Request: the snapshot target, message, visibility, defaults, and one Requested Roll per targeted Investigator. */
export interface RollRequest {
  id: string
  target: RollRequestTarget
  message: string | null
  visibility: 'Public' | 'KeeperOnly'
  difficulty: 'Regular' | 'Hard' | 'Extreme'
  bonusDice: number
  penaltyDice: number
  createdAt: string
  requestedRolls: RequestedRoll[]
}

/** A Roll Request's message is at most 2000 characters (specs/roll-requests/ux.md section 3). */
export const ROLL_REQUEST_MESSAGE_MAX_LENGTH = 2000

/** One Waiting Requested Roll with the Roll Request's target, message, and creation time. */
export interface WaitingRequestedRoll {
  rollRequestId: string
  target: RollRequestTarget
  message: string | null
  createdAt: string
  roll: RequestedRoll
}

/** The caller's Waiting Requested Rolls in the Active Scene, oldest first. */
export interface WaitingRolls {
  investigatorName: string | null
  rolls: WaitingRequestedRoll[]
}

/** One Investigator's part of a create call: who rolls, with optional Difficulty and dice overriding the request's defaults. */
export interface RequestedRollCreateInput {  investigatorId: string
  difficulty?: 'Regular' | 'Hard' | 'Extreme'
  bonusDice?: number
  penaltyDice?: number
}

/** Requests rolls of the Active Scene; visibility is always Public in PBI-DICE-005. */
export interface CreateRollRequestInput {
  target: RollRequestTarget
  message?: string
  difficulty: 'Regular' | 'Hard' | 'Extreme'
  bonusDice: number
  penaltyDice: number
  investigators: RequestedRollCreateInput[]
}
