import { authHeaders } from '@/campaign-play/services/authHeaders'
import { nonPlayerEntityLinkSchema, SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import type {
  NewNonPlayerEntityLinkInput,
  NonPlayerEntityLink,
  NonPlayerEntityLinkField,
  NonPlayerEntityLinkInput,
} from '@/scenario-preparation/types/Scene'

/** The messages the server returned for a refused link, by field (ADR 0018). */
export type NonPlayerEntityLinkFieldErrors = Partial<Record<NonPlayerEntityLinkField, string>>

/** The API answered 404 to a link write: the link, or its Scene, is outside the caller's visibility or gone. */
export class NonPlayerEntityLinkNotFoundError extends Error {
  constructor() {
    super('The link was not found')
    this.name = 'NonPlayerEntityLinkNotFoundError'
  }
}

/** The API answered 400 with the server's message for each refused field. */
export class NonPlayerEntityLinkValidationError extends Error {
  readonly fieldErrors: NonPlayerEntityLinkFieldErrors

  constructor(fieldErrors: NonPlayerEntityLinkFieldErrors) {
    super('The link was refused')
    this.name = 'NonPlayerEntityLinkValidationError'
    this.fieldErrors = fieldErrors
  }
}

const FIELDS: Record<string, NonPlayerEntityLinkField> = {
  nonplayerentity: 'nonPlayerEntity',
  playerfacingname: 'playerFacingName',
  playerfacingdescription: 'playerFacingDescription',
}

const linksUrl = (campaignId: string, scenarioId: string, sceneId: string): string =>
  `/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}/non-player-entity-links`

async function readFieldErrors(response: Response): Promise<NonPlayerEntityLinkFieldErrors> {
  const errors: NonPlayerEntityLinkFieldErrors = {}
  for (const problem of await readValidationProblems(response)) {
    const field = FIELDS[problem.path]
    if (field && problem.messages[0]) {
      errors[field] = problem.messages[0]
    }
  }
  return errors
}

// For link writes a 409 only means the Scene is Finished.
async function failWrite(response: Response, description: string): Promise<never> {
  if (response.status === 404) {
    throw new NonPlayerEntityLinkNotFoundError()
  }
  if (response.status === 400) {
    throw new NonPlayerEntityLinkValidationError(await readFieldErrors(response))
  }
  if (response.status === 409) {
    throw new SceneFinishedError()
  }
  throw new Error(`Failed to ${description} (${response.status})`)
}

/** Calls POST .../non-player-entity-links, which links an entity of the Campaign to the Scene. */
export async function linkNonPlayerEntity(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  input: NewNonPlayerEntityLinkInput,
): Promise<NonPlayerEntityLink> {
  const response = await fetch(linksUrl(campaignId, scenarioId, sceneId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      nonPlayerEntity: input.nonPlayerEntity,
      playerFacingName: input.playerFacingName,
      playerFacingDescription: input.playerFacingDescription,
    }),
  })

  if (!response.ok) {
    return failWrite(response, 'link the Non-Player Entity')
  }

  return nonPlayerEntityLinkSchema.parse(await response.json())
}

/** Calls PUT .../non-player-entity-links/{linkId}, which replaces the Player-facing name and description. */
export async function editNonPlayerEntityLink(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  linkId: string,
  input: NonPlayerEntityLinkInput,
): Promise<NonPlayerEntityLink> {
  const response = await fetch(`${linksUrl(campaignId, scenarioId, sceneId)}/${linkId}`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ playerFacingName: input.playerFacingName, playerFacingDescription: input.playerFacingDescription }),
  })

  if (!response.ok) {
    return failWrite(response, 'save the link')
  }

  return nonPlayerEntityLinkSchema.parse(await response.json())
}

/** Calls DELETE .../non-player-entity-links/{linkId}. A link that is already gone (404) counts as unlinked. */
export async function unlinkNonPlayerEntity(
  accessToken: string,
  campaignId: string,
  scenarioId: string,
  sceneId: string,
  linkId: string,
): Promise<void> {
  const response = await fetch(`${linksUrl(campaignId, scenarioId, sceneId)}/${linkId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (response.status === 409) {
    throw new SceneFinishedError()
  }
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to unlink the Non-Player Entity (${response.status})`)
  }
}
