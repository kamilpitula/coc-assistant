import { expect, type APIRequestContext } from '@playwright/test'

import { API_ORIGIN } from './investigators'
import { itemLinksApiUrl, itemsApiUrl } from './items'
import { humanNpcsApiUrl, mythosCreaturesApiUrl } from './non-player-entities'
import { linksApiUrl } from './scene-links'
import { handoutsApiUrl, PDF_BYTES, PNG_BYTES, padded, textDocument } from './scene-handouts'
import { scenariosApiUrl } from './scenarios'
import { scenesApiUrl } from './scenes'

/** The ids and titles of a Scenario that was prepared by hand through the API (PBI-SP-006 D1). */
export interface PreparedScenario {
  campaignId: string
  scenarioId: string
  /** The Scene that carries the links, Handouts, and Item. Listed second, after the reorder. */
  sceneId: string
  scenePath: string
  scenarioPath: string
  humanNpcId: string
  humanNpcPath: string
  itemId: string
  /** The Handout ids by title. */
  sceneHandoutIds: Record<string, string>
  /** Text in every Keeper-facing field, so a test can prove a Player sees none of it. */
  secret: string
}

export const PREPARED = {
  scenarioTitle: 'The Haunting',
  firstSceneTitle: 'The Corbitt House',
  secondSceneTitle: 'Meeting Knott',
  humanNpcName: 'Mr. Knott',
  creatureName: 'Ghoul',
  humanNpcLinkName: 'The landlord',
  creatureLinkName: 'A shape in the cellar',
  itemName: "Walter Corbitt's diary",
  /** Scene Handouts in stored order with the kind and visibility the Keeper chose. */
  handouts: [
    { title: 'The front door', kind: 'ReadAloud', visibility: 'PlayerFacing', kindText: 'Read-aloud', visibilityText: 'Player-facing' },
    { title: 'The secret door', kind: 'Text', visibility: 'KeeperFacing', kindText: 'Text', visibilityText: 'Keeper-facing' },
    { title: 'Corbitt House plan', kind: 'Image', visibility: 'PlayerFacing', kindText: 'Image', visibilityText: 'Player-facing' },
    { title: 'Arkham map', kind: 'Map', visibility: 'KeeperFacing', kindText: 'Map', visibilityText: 'Keeper-facing' },
    { title: 'Diary pages', kind: 'Document', visibility: 'KeeperFacing', kindText: 'Document', visibilityText: 'Keeper-facing' },
  ],
  mapFileName: 'arkham-map.png',
  documentFileName: 'diary-pages.pdf',
  itemHandouts: ['The last entry', 'Torn page photo'],
} as const

async function postJson(request: APIRequestContext, bearer: string, url: string, data: unknown, status = 201): Promise<string> {
  const response = await request.post(url, { headers: { Authorization: bearer }, data })
  expect(response.status(), `POST ${url}`).toBe(status)
  return ((await response.json()) as { id: string }).id
}

async function putJson(request: APIRequestContext, bearer: string, url: string, data: unknown): Promise<void> {
  const response = await request.put(url, { headers: { Authorization: bearer }, data })
  expect(response.status(), `PUT ${url}`).toBe(200)
}

async function postFile(
  request: APIRequestContext,
  bearer: string,
  url: string,
  file: { title: string; kind: string; visibility: string; name: string; mimeType: string; buffer: Buffer },
): Promise<string> {
  const response = await request.post(url, {
    headers: { Authorization: bearer },
    multipart: {
      kind: file.kind,
      visibility: file.visibility,
      title: file.title,
      file: { name: file.name, mimeType: file.mimeType, buffer: file.buffer },
    },
  })
  expect(response.status(), `POST ${url}`).toBe(201)
  return ((await response.json()) as { id: string }).id
}

/**
 * Prepares a Scenario in the Campaign through the API as the Keeper who owns the bearer: two Scenes (reordered so that
 * "Meeting Knott" comes first), a Human NPC and a Mythos Creature linked to "The Corbitt House", one Handout of every kind
 * on it with mixed visibilities, and an Item with two Handouts linked to it. Every text field carries the returned
 * `secret`. Nothing is created through the UI (e2e/CLAUDE.md section 2).
 */
export async function prepareScenarioViaApi(request: APIRequestContext, bearer: string, campaignId: string, secret: string): Promise<PreparedScenario> {
  const scenarioId = await postJson(request, bearer, scenariosApiUrl(API_ORIGIN, campaignId), {
    title: PREPARED.scenarioTitle,
    keeperNotes: `Scenario notes ${secret}`,
  })
  const firstSceneId = await postJson(request, bearer, scenesApiUrl(API_ORIGIN, campaignId, scenarioId), {
    title: PREPARED.firstSceneTitle,
    location: `Arkham ${secret}`,
    keeperNotes: textDocument(`Scene notes ${secret}`),
  })
  const secondSceneId = await postJson(request, bearer, scenesApiUrl(API_ORIGIN, campaignId, scenarioId), { title: PREPARED.secondSceneTitle })
  await putJson(request, bearer, scenesApiUrl(API_ORIGIN, campaignId, scenarioId, '/order'), { sceneIds: [secondSceneId, firstSceneId] })

  const humanNpcId = await postJson(request, bearer, humanNpcsApiUrl(API_ORIGIN, campaignId), { name: PREPARED.humanNpcName, age: 62 })
  const creatureId = await postJson(request, bearer, mythosCreaturesApiUrl(API_ORIGIN, campaignId), { name: PREPARED.creatureName })
  const links = linksApiUrl(API_ORIGIN, campaignId, scenarioId, firstSceneId)
  await postJson(request, bearer, links, {
    nonPlayerEntity: { type: 'HumanNpc', id: humanNpcId },
    playerFacingName: PREPARED.humanNpcLinkName,
    playerFacingDescription: textDocument(`Landlord ${secret}`),
  })
  await postJson(request, bearer, links, {
    nonPlayerEntity: { type: 'MythosCreature', id: creatureId },
    playerFacingName: PREPARED.creatureLinkName,
    playerFacingDescription: null,
  })

  const sceneHandoutIds: Record<string, string> = {}
  const handoutsUrl = handoutsApiUrl(API_ORIGIN, campaignId, scenarioId, firstSceneId)
  for (const handout of PREPARED.handouts) {
    sceneHandoutIds[handout.title] = await addSceneHandout(request, bearer, handoutsUrl, handout, secret)
  }

  const itemId = await postJson(request, bearer, itemsApiUrl(API_ORIGIN, campaignId), {
    name: PREPARED.itemName,
    playerFacingDescription: textDocument(`Diary ${secret}`),
    keeperNotes: textDocument(`Item notes ${secret}`),
  })
  const itemHandouts = itemsApiUrl(API_ORIGIN, campaignId, `/${itemId}/handouts`)
  await postJson(request, bearer, itemHandouts, { kind: 'Text', visibility: 'PlayerFacing', title: PREPARED.itemHandouts[0], content: textDocument(`Entry ${secret}`) })
  await postFile(request, bearer, itemHandouts, {
    title: PREPARED.itemHandouts[1],
    kind: 'Image',
    visibility: 'KeeperFacing',
    name: 'torn-page.png',
    mimeType: 'image/png',
    buffer: PNG_BYTES,
  })
  await postJson(request, bearer, itemLinksApiUrl(API_ORIGIN, campaignId, scenarioId, firstSceneId), { itemId })

  const scenarioPath = `/campaigns/${campaignId}/scenarios/${scenarioId}`
  return {
    campaignId,
    scenarioId,
    sceneId: firstSceneId,
    scenePath: `${scenarioPath}/scenes/${firstSceneId}`,
    scenarioPath,
    humanNpcId,
    humanNpcPath: `/campaigns/${campaignId}/human-npcs/${humanNpcId}`,
    itemId,
    sceneHandoutIds,
    secret,
  }
}

async function addSceneHandout(
  request: APIRequestContext,
  bearer: string,
  url: string,
  handout: (typeof PREPARED.handouts)[number],
  secret: string,
): Promise<string> {
  if (handout.kind === 'ReadAloud' || handout.kind === 'Text') {
    return postJson(request, bearer, url, {
      kind: handout.kind,
      visibility: handout.visibility,
      title: handout.title,
      content: textDocument(`${handout.title} ${secret}`),
    })
  }
  const isDocument = handout.kind === 'Document'
  return postFile(request, bearer, url, {
    title: handout.title,
    kind: handout.kind,
    visibility: handout.visibility,
    name: handout.kind === 'Map' ? PREPARED.mapFileName : isDocument ? PREPARED.documentFileName : 'corbitt-house.png',
    mimeType: isDocument ? 'application/pdf' : 'image/png',
    buffer: isDocument ? padded(PDF_BYTES, 2048) : PNG_BYTES,
  })
}
