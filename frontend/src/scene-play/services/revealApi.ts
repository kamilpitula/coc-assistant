import { bearerHeaders, authHeaders } from '@/campaign-play/services/authHeaders'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import { keeperRevealSchema } from '@/scene-play/services/revealSchemas'
import type { KeeperReveal, RevealInput } from '@/scene-play/types/Reveal'

export const revealQueryKeys = {
  /** A Reveal's stored file. It sits outside the Active Scene's keys, so a live refetch of the Scene leaves it alone: a snapshot never changes. */
  file: (campaignId: string, revealId: string) => ['campaigns', campaignId, 'reveals', revealId, 'file'] as const,
}

/** The API answered 409: no Scene is Active any more, so nothing more can be revealed. */
export class RevealSceneFinishedError extends Error {
  constructor() {
    super('No Scene is Active')
    this.name = 'RevealSceneFinishedError'
  }
}

/** The API answered 400 at the subject: it is not on the Active Scene, is Keeper-facing, or cannot be revealed. */
export class RevealSubjectRefusedError extends Error {
  constructor() {
    super('The subject can not be revealed')
    this.name = 'RevealSubjectRefusedError'
  }
}

/** The API answered 400 at investigatorIds: one of them is not (or no longer) present. */
export class RevealInvestigatorsRefusedError extends Error {
  constructor() {
    super('The Investigators were refused')
    this.name = 'RevealInvestigatorsRefusedError'
  }
}

/** The API answered 404: the Reveal's file is not this caller's. */
export class RevealFileNotFoundError extends Error {
  constructor() {
    super('The revealed file was not found')
    this.name = 'RevealFileNotFoundError'
  }
}

async function failReveal(response: Response): Promise<never> {
  if (response.status === 409) {
    throw new RevealSceneFinishedError()
  }
  if (response.status === 400) {
    const paths = (await readValidationProblems(response)).map((problem) => problem.path)
    throw paths.some((path) => path.startsWith('subject')) ? new RevealSubjectRefusedError() : new RevealInvestigatorsRefusedError()
  }
  throw new Error(`Failed to reveal (${response.status})`)
}

/** Calls POST .../active-scene/reveals (Keeper only); returns the created Reveal as the Keeper sees it (PBI-SPL-002 D5). */
export async function revealToInvestigators(accessToken: string, campaignId: string, input: RevealInput): Promise<KeeperReveal> {
  const response = await fetch(`/api/campaigns/${campaignId}/active-scene/reveals`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ subject: { type: input.subjectType, id: input.subjectId }, investigatorIds: input.investigatorIds }),
  })

  return response.ok ? keeperRevealSchema.parse(await response.json()) : failReveal(response)
}

/** Calls GET .../reveals/{revealId}/file with the bearer token and returns the snapshotted bytes; an img tag cannot send the header. */
export async function getRevealFile(accessToken: string, campaignId: string, revealId: string): Promise<Blob> {
  const response = await fetch(`/api/campaigns/${campaignId}/reveals/${revealId}/file`, { headers: bearerHeaders(accessToken) })

  if (response.status === 404) {
    throw new RevealFileNotFoundError()
  }
  if (!response.ok) {
    throw new Error(`Failed to load the revealed file (${response.status})`)
  }

  return response.blob()
}
