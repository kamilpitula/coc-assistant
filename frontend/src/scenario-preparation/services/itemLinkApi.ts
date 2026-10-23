import { authHeaders } from '@/campaign-play/services/authHeaders'
import { itemLinkSchema, SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { readValidationProblems } from '@/scenario-preparation/services/validationProblem'
import type { ItemLink } from '@/scenario-preparation/types/Item'

/** The API answered 404 to a link write: the Scene is outside the caller's visibility or gone. */
export class ItemLinkNotFoundError extends Error {
  constructor() {
    super('The Scene was not found')
    this.name = 'ItemLinkNotFoundError'
  }
}

/** The API answered 400: the Item is not one of the Campaign's, with the server's message for the picker (ADR 0018). */
export class ItemLinkValidationError extends Error {
  readonly itemMessage: string | undefined

  constructor(itemMessage: string | undefined) {
    super('The Item was refused')
    this.name = 'ItemLinkValidationError'
    this.itemMessage = itemMessage
  }
}

const linksUrl = (campaignId: string, scenarioId: string, sceneId: string): string =>
  `/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}/item-links`

/**
 * Calls POST .../item-links, which links an Item of the Campaign to the Scene. The Item may already be linked: the server then
 * answers 200 with the existing link, which is a success here too (design record PBI-SP-008, D4).
 */
export async function linkItem(accessToken: string, campaignId: string, scenarioId: string, sceneId: string, itemId: string): Promise<ItemLink> {
  const response = await fetch(linksUrl(campaignId, scenarioId, sceneId), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ itemId }),
  })

  if (response.status === 404) {
    throw new ItemLinkNotFoundError()
  }
  if (response.status === 400) {
    const problem = (await readValidationProblems(response)).find((candidate) => candidate.path === 'itemid')
    throw new ItemLinkValidationError(problem?.messages[0])
  }
  if (response.status === 409) {
    throw new SceneFinishedError()
  }
  if (!response.ok) {
    throw new Error(`Failed to link the Item (${response.status})`)
  }

  return itemLinkSchema.parse(await response.json())
}

/** Calls DELETE .../item-links/{linkId}. A link that is already gone (404) counts as unlinked. */
export async function unlinkItem(accessToken: string, campaignId: string, scenarioId: string, sceneId: string, linkId: string): Promise<void> {
  const response = await fetch(`${linksUrl(campaignId, scenarioId, sceneId)}/${linkId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })

  if (response.status === 409) {
    throw new SceneFinishedError()
  }
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to unlink the Item (${response.status})`)
  }
}
