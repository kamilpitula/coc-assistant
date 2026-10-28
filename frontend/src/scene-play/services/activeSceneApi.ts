import { z } from 'zod'

import { authHeaders } from '@/campaign-play/services/authHeaders'
import type { ActiveScene, KeeperActiveScene, StartSceneInput } from '@/scene-play/types/ActiveScene'

// Strict, so a field the contract does not name (such as another Player's Investigator id) is rejected, not passed on.
const keeperSchema = z.strictObject({
  sceneId: z.string(),
  scenarioId: z.string(),
  scenarioTitle: z.string(),
  title: z.string(),
  location: z.string(),
  startedAt: z.string().nullable(),
  investigatorsPresent: z.array(z.strictObject({ id: z.string(), name: z.string().nullable() })),
  reveals: z.array(z.unknown()),
})

const presentPlayerSchema = z.strictObject({
  isPresent: z.literal(true),
  title: z.string(),
  location: z.string(),
  investigatorsPresent: z.array(z.strictObject({ name: z.string().nullable(), isYours: z.boolean() })),
  reveals: z.array(z.unknown()),
})

const absentPlayerSchema = z.strictObject({ title: z.string(), isPresent: z.literal(false) })

const activeSceneSchema = z.union([
  keeperSchema.transform((scene): KeeperActiveScene => ({ kind: 'keeper', ...scene })),
  presentPlayerSchema.transform(
    ({ title, location, investigatorsPresent }): ActiveScene => ({ kind: 'present-player', title, location, investigatorsPresent }),
  ),
  absentPlayerSchema.transform(({ title }): ActiveScene => ({ kind: 'absent-player', title })),
])

export const activeSceneQueryKeys = {
  detail: (campaignId: string) => ['campaigns', campaignId, 'active-scene'] as const,
}

/** The API answered 409 to a start: the Scene is no longer Prepared. */
export class SceneNotPreparedError extends Error {
  constructor() {
    super('The Scene is not Prepared')
    this.name = 'SceneNotPreparedError'
  }
}

/** The API answered 409 to a start: another Scene is (now) Active and was not to be finished. */
export class AnotherSceneActiveError extends Error {
  constructor() {
    super('Another Scene is Active')
    this.name = 'AnotherSceneActiveError'
  }
}

/** The API answered 409 to a finish or a change of who is present: no Scene is Active. */
export class NoActiveSceneError extends Error {
  constructor() {
    super('No Scene is Active')
    this.name = 'NoActiveSceneError'
  }
}

/** The API answered 400: the present list is empty, repeats an Investigator, or names one that is not Approved. */
export class InvestigatorsRefusedError extends Error {
  constructor() {
    super('The Investigators present were refused')
    this.name = 'InvestigatorsRefusedError'
  }
}

const NOT_PREPARED_TITLE = 'Only a Prepared Scene can be started.'

/** Calls GET .../active-scene: the Active Scene as the caller may see it, or null when no Scene is Active (204). */
export async function getActiveScene(accessToken: string, campaignId: string): Promise<ActiveScene | null> {
  const response = await fetch(`/api/campaigns/${campaignId}/active-scene`, { headers: authHeaders(accessToken) })

  if (response.status === 204) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to load the Active Scene (${response.status})`)
  }

  return activeSceneSchema.parse(await response.json())
}

function parseKeeperScene(body: unknown): KeeperActiveScene {
  return { kind: 'keeper', ...keeperSchema.parse(body) }
}

/** Calls POST .../scenes/{sceneId}/start (Keeper only); finishActiveScene finishes the Active Scene in the same transaction. */
export async function startScene(accessToken: string, campaignId: string, sceneId: string, input: StartSceneInput): Promise<KeeperActiveScene> {
  const response = await fetch(`/api/campaigns/${campaignId}/scenes/${sceneId}/start`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  })

  if (response.status === 409) {
    const problem: unknown = await response.json().catch(() => null)
    throw (problem as { title?: string } | null)?.title === NOT_PREPARED_TITLE ? new SceneNotPreparedError() : new AnotherSceneActiveError()
  }
  if (response.status === 400) {
    throw new InvestigatorsRefusedError()
  }
  if (!response.ok) {
    throw new Error(`Failed to start the Scene (${response.status})`)
  }

  return parseKeeperScene(await response.json())
}

/** Calls POST .../active-scene/finish (Keeper only). */
export async function finishActiveScene(accessToken: string, campaignId: string): Promise<void> {
  const response = await fetch(`/api/campaigns/${campaignId}/active-scene/finish`, { method: 'POST', headers: authHeaders(accessToken) })

  if (response.status === 409) {
    throw new NoActiveSceneError()
  }
  if (!response.ok) {
    throw new Error(`Failed to finish the Scene (${response.status})`)
  }
}

/** Calls PUT .../active-scene/present-investigators (Keeper only): the complete new list. */
export async function changeInvestigatorsPresent(accessToken: string, campaignId: string, presentInvestigatorIds: string[]): Promise<KeeperActiveScene> {
  const response = await fetch(`/api/campaigns/${campaignId}/active-scene/present-investigators`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ presentInvestigatorIds }),
  })

  if (response.status === 409) {
    throw new NoActiveSceneError()
  }
  if (response.status === 400) {
    throw new InvestigatorsRefusedError()
  }
  if (!response.ok) {
    throw new Error(`Failed to save who is present (${response.status})`)
  }

  return parseKeeperScene(await response.json())
}
