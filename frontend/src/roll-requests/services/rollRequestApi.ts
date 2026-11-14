import { z } from 'zod'

import { apiFetch } from '@/shared/services/apiFetch'
import { authHeaders } from '@/campaign-play/services/authHeaders'
import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import type {
  CreateRollRequestInput,
  RequestedRoll,
  RollRequest,
  WaitingRolls,
} from '@/roll-requests/types/RollRequest'

// Strict, so a field the contract does not name (for example another Investigator's id or an Account id) is rejected,
// not passed on.
const targetSchema = z.strictObject({
  kind: z.enum(['Skill', 'Characteristic', 'Luck']),
  skill: z.string().nullable(),
  specialization: z.string().nullable(),
  characteristic: z.string().nullable(),
})

const percentileSchema = z.strictObject({
  unitsFace: z.number().int(),
  tensFaces: z.array(z.number().int()),
  keptTens: z.number().int(),
  result: z.number().int(),
  successLevel: z.enum(['Fumble', 'Failure', 'Regular', 'Hard', 'Extreme', 'Critical']),
  isSuccess: z.boolean(),
})

const completedRollSchema = z.strictObject({
  dice: z.string(),
  result: z.number().int(),
  faces: z.array(z.number().int()).nullable(),
  rolledBy: z.string().nullable(),
  rolledAt: z.string().nullable(),
  percentile: percentileSchema.nullable(),
  earnsExperienceCheck: z.boolean().nullable(),
})

const requestedRollSchema = z.strictObject({
  investigatorId: z.string(),
  investigatorName: z.string().nullable(),
  targetValue: z.number().int(),
  usesBaseValue: z.boolean(),
  canEarnExperienceCheck: z.boolean(),
  difficulty: z.enum(['Regular', 'Hard', 'Extreme']),
  bonusDice: z.number().int(),
  penaltyDice: z.number().int(),
  status: z.enum(['Waiting', 'Rolled', 'Cancelled']),
  rolls: z.array(completedRollSchema),
})

const rollRequestSchema = z.strictObject({
  id: z.string(),
  target: targetSchema,
  message: z.string().nullable(),
  visibility: z.enum(['Public', 'KeeperOnly']),
  difficulty: z.enum(['Regular', 'Hard', 'Extreme']),
  bonusDice: z.number().int(),
  penaltyDice: z.number().int(),
  createdAt: z.string(),
  requestedRolls: z.array(requestedRollSchema),
})

const waitingRollSchema = z.strictObject({
  rollRequestId: z.string(),
  target: targetSchema,
  message: z.string().nullable(),
  createdAt: z.string(),
  roll: requestedRollSchema,
})

const waitingRollsSchema = z.strictObject({
  investigatorName: z.string().nullable(),
  rolls: z.array(waitingRollSchema),
})

export const rollRequestQueryKeys = {
  /** Every Roll Request query of the Campaign. */
  all: (campaignId: string) => ['campaigns', campaignId, 'roll-requests'] as const,
  detail: (campaignId: string, rollRequestId: string) => ['campaigns', campaignId, 'roll-requests', rollRequestId] as const,
  activeScene: (campaignId: string) => ['campaigns', campaignId, 'roll-requests', 'active-scene'] as const,
  mine: (campaignId: string) => ['campaigns', campaignId, 'roll-requests', 'mine'] as const,
}

/** The API refused the request (400): every field message joined, for the form's Alert (specs/roll-requests/ux.md section 3). */
export class RollRequestRefusedError extends Error {
  constructor(reasons: string) {
    super(`We couldn't request that roll: ${reasons}.`)
    this.name = 'RollRequestRefusedError'
  }
}

/** The API answered 409 to a roll with anything but "No Scene is Active": the roll was already made. */
export class AlreadyRolledError extends Error {
  constructor() {
    super('The roll was already made')
    this.name = 'AlreadyRolledError'
  }
}

/** The API answered 409 with "This roll was cancelled.": the roll was already cancelled (specs/roll-requests/spec.md, cancel contract). */
export class RequestedRollCancelledError extends Error {
  constructor() {
    super('The roll was cancelled')
    this.name = 'RequestedRollCancelledError'
  }
}

/** The roll's Roll Request is gone or no longer visible (404): the row leaves the panel without a message. */
export class RequestedRollGoneError extends Error {
  constructor() {
    super('The roll is gone or no longer visible')
    this.name = 'RequestedRollGoneError'
  }
}

const NO_ACTIVE_SCENE_TITLE = 'No Scene is Active.'
const CANCELLED_TITLE = 'This roll was cancelled.'

async function problemTitle(response: Response): Promise<string | null> {
  const problem: unknown = await response.json().catch(() => null)
  const title = (problem as { title?: unknown } | null)?.title
  return typeof title === 'string' ? title : null
}

async function refusalReasons(response: Response): Promise<string> {
  const problem: unknown = await response.json().catch(() => null)
  const errors = (problem as { errors?: unknown } | null)?.errors
  if (errors !== null && typeof errors === 'object' && errors !== undefined) {
    const reasons = Object.values(errors as Record<string, unknown>).flat().filter((reason): reason is string => typeof reason === 'string')
    if (reasons.length > 0) {
      return reasons.join(' ')
    }
  }
  return 'the request was refused.'
}

/** Calls POST .../active-scene/roll-requests (Keeper only); 409 means no Scene is Active, 400 carries the refusal. */
export async function requestRoll(accessToken: string, campaignId: string, input: CreateRollRequestInput): Promise<RollRequest> {
  const response = await apiFetch(`/api/campaigns/${campaignId}/active-scene/roll-requests`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  })

  if (response.status === 409) {
    throw new NoActiveSceneError()
  }
  if (response.status === 400) {
    throw new RollRequestRefusedError(await refusalReasons(response))
  }
  if (!response.ok) {
    throw new Error(`Failed to request the roll (${response.status})`)
  }

  return rollRequestSchema.parse(await response.json())
}

/** Calls GET .../roll-requests/{id}: the request as the caller may see it, or null when it is gone or not visible (404). */
export async function getRollRequest(accessToken: string, campaignId: string, rollRequestId: string): Promise<RollRequest | null> {
  const response = await apiFetch(`/api/campaigns/${campaignId}/roll-requests/${rollRequestId}`, {
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Roll Request (${response.status})`)
  }

  return rollRequestSchema.parse(await response.json())
}

/** Calls GET .../active-scene/roll-requests (Keeper only): the Active Scene's requests, oldest first; null for anyone else (404). */
export async function getActiveSceneRollRequests(accessToken: string, campaignId: string): Promise<RollRequest[] | null> {
  const response = await apiFetch(`/api/campaigns/${campaignId}/active-scene/roll-requests`, {
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Waiting rolls (${response.status})`)
  }

  return z.array(rollRequestSchema).parse(await response.json())
}

/** Calls GET .../investigators/mine/requested-rolls (Player only); null without an Approved Investigator (404). */
export async function getMyRequestedRolls(accessToken: string, campaignId: string): Promise<WaitingRolls | null> {
  const response = await apiFetch(`/api/campaigns/${campaignId}/investigators/mine/requested-rolls`, {
    headers: authHeaders(accessToken),
  })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the rolls waiting for you (${response.status})`)
  }

  return waitingRollsSchema.parse(await response.json())
}

/**
 * Calls POST .../roll-requests/{id}/requested-rolls/{investigatorId}/roll: rolls the Requested Roll with the server's
 * dice and returns it. 409 means the roll was already made, or already cancelled, unless the Scene is no longer Active.
 */
export async function rollRequestedRoll(
  accessToken: string,
  campaignId: string,
  rollRequestId: string,
  investigatorId: string,
): Promise<RequestedRoll> {
  const response = await apiFetch(`/api/campaigns/${campaignId}/roll-requests/${rollRequestId}/requested-rolls/${investigatorId}/roll`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })

  return parseRequestedRoll(response, 'roll')
}

/**
 * Calls POST .../roll-requests/{id}/requested-rolls/{investigatorId}/cancel (Keeper only): cancels the Waiting
 * Requested Roll and returns it (specs/roll-requests/ux.md section 17.1).
 */
export async function cancelRequestedRoll(
  accessToken: string,
  campaignId: string,
  rollRequestId: string,
  investigatorId: string,
): Promise<RequestedRoll> {
  const response = await apiFetch(`/api/campaigns/${campaignId}/roll-requests/${rollRequestId}/requested-rolls/${investigatorId}/cancel`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })

  return parseRequestedRoll(response, 'cancel')
}

/** Reads a roll or cancel response: 404 leaves without a message, 409 names the refusal, anything else throws. */
async function parseRequestedRoll(response: Response, verb: 'roll' | 'cancel'): Promise<RequestedRoll> {
  if (response.status === 404) {
    throw new RequestedRollGoneError()
  }
  if (response.status === 409) {
    const title = await problemTitle(response)
    if (title === NO_ACTIVE_SCENE_TITLE) {
      throw new NoActiveSceneError()
    }
    throw title === CANCELLED_TITLE ? new RequestedRollCancelledError() : new AlreadyRolledError()
  }
  if (!response.ok) {
    throw new Error(`Failed to ${verb} (${response.status})`)
  }

  return requestedRollSchema.parse(await response.json())
}
