import { expect, type APIRequestContext, type Browser, type Locator, type Page } from '@playwright/test'

import { newAccount, signIn } from './auth'
import { createCampaignViaUi, issueInviteViaUi } from './campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from './investigators'
import { prepareScenarioViaApi, type PreparedScenario } from './prepared-scenario'
import { scenesApiUrl } from './scenes'

/**
 * Locators and API actions for Scene Play (specs/scene-play/ux.md): the start page, the Active Scene page, and the overview card.
 * Scenes are started and finished through the API where a journey only needs them as a precondition (e2e/CLAUDE.md section 2).
 */
export function activeSceneCard(page: Page): Locator {
  return page.getByRole('region', { name: 'Active Scene' })
}

/** The "Investigators present" fieldset of the start page and of the Active Scene page's change mode. */
export function presentFieldset(page: Page): Locator {
  return page.getByRole('group', { name: 'Investigators present' })
}

/** The "Investigators present" section of the Keeper's Active Scene page. */
export function presentSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Investigators present' })
}

/** The page's status message (navigation and save messages, and a Player's announcements). */
export function pageStatus(page: Page): Locator {
  return page.getByRole('status').filter({ hasText: /\S/ })
}

const SKILL_ALLOCATIONS = [
  { skill: 'Credit Rating', occupationPoints: 30 },
  { skill: 'Library Use', occupationPoints: 50 },
  { skill: 'Appraise', occupationPoints: 50 },
  { skill: 'History', occupationPoints: 50 },
  { skill: 'Spot Hidden', occupationPoints: 20 },
  { skill: 'Drive Auto', personalInterestPoints: 60 },
  { skill: 'Listen', personalInterestPoints: 60 },
]

function validCharacterSheet(name: string): unknown {
  return {
    identity: { name, age: 25, gender: null, residence: 'Boston', birthplace: null },
    creationMethod: 'PointBuy',
    characteristics: { STR: 60, CON: 60, DEX: 60, APP: 50, POW: 60, SIZ: 60, INT: 60, EDU: 50 },
    ageEffects: { deductions: {}, eduImprovementChecks: [{ check: 30, gain: null }] },
    luckRolls: [11],
    occupation: {
      catalogId: 'antiquarian',
      formulaCharacteristics: [],
      skillChoices: [
        [],
        [{ skill: 'Art/Craft', specialization: 'Painting' }],
        [],
        [],
        [{ skill: 'Language (Other)', specialization: 'Latin' }],
        [{ skill: 'Charm', specialization: null }],
        [],
        [{ skill: 'Firearms', specialization: 'Handgun' }],
      ],
    },
    skills: SKILL_ALLOCATIONS,
  }
}

async function ok(response: Awaited<ReturnType<APIRequestContext['post']>>, description: string, status = 200): Promise<void> {
  expect(response.status(), description).toBe(status)
}

/**
 * Creates, submits, and approves a valid Point Buy Investigator for the Player who owns `playerBearer`, as the Keeper who owns
 * `keeperBearer`, and returns its id. This is the API form of the wizard journey, which investigator-lifecycle.spec.ts covers.
 */
export async function createApprovedInvestigatorViaApi(
  request: APIRequestContext,
  keeperBearer: string,
  playerBearer: string,
  campaignId: string,
  name: string,
): Promise<string> {
  const investigators = `${API_ORIGIN}/api/campaigns/${campaignId}/investigators`
  const created = await request.post(investigators, { headers: { Authorization: playerBearer } })
  await ok(created, 'create the Investigator', 201)
  const id = ((await created.json()) as { id: string }).id
  await ok(await request.put(`${investigators}/mine/character-sheet`, { headers: { Authorization: playerBearer }, data: validCharacterSheet(name) }), 'save the Character Sheet')
  await ok(await request.post(`${investigators}/mine/submit`, { headers: { Authorization: playerBearer } }), 'submit the Investigator')
  await ok(await request.post(`${investigators}/${id}/approve`, { headers: { Authorization: keeperBearer } }), 'approve the Investigator')
  return id
}

/** The id of the Scenario's Scene with this title. */
export async function sceneIdByTitle(request: APIRequestContext, bearer: string, campaignId: string, scenarioId: string, title: string): Promise<string> {
  const response = await request.get(scenesApiUrl(API_ORIGIN, campaignId, scenarioId), { headers: { Authorization: bearer } })
  await ok(response, 'list the Scenes')
  const scene = ((await response.json()) as { scenes: Array<{ id: string; title: string }> }).scenes.find((candidate) => candidate.title === title)
  if (!scene) {
    throw new Error(`No Scene titled "${title}"`)
  }
  return scene.id
}

/** Starts a Prepared Scene as the Keeper through the API. */
export async function startSceneViaApi(
  request: APIRequestContext,
  keeperBearer: string,
  campaignId: string,
  sceneId: string,
  presentInvestigatorIds: string[],
  finishActiveScene = false,
): Promise<void> {
  const response = await request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/scenes/${sceneId}/start`, {
    headers: { Authorization: keeperBearer },
    data: { presentInvestigatorIds, finishActiveScene },
  })
  await ok(response, `start Scene ${sceneId}`)
}

/** Finishes the Campaign's Active Scene as the Keeper through the API. */
export async function finishActiveSceneViaApi(request: APIRequestContext, keeperBearer: string, campaignId: string): Promise<void> {
  const response = await request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/active-scene/finish`, { headers: { Authorization: keeperBearer } })
  await ok(response, 'finish the Active Scene', 204)
}

/** Replaces the Investigators present in the Active Scene as the Keeper through the API. */
export async function changePresentViaApi(request: APIRequestContext, keeperBearer: string, campaignId: string, presentInvestigatorIds: string[]): Promise<void> {
  const response = await request.put(`${API_ORIGIN}/api/campaigns/${campaignId}/active-scene/present-investigators`, {
    headers: { Authorization: keeperBearer },
    data: { presentInvestigatorIds },
  })
  await ok(response, 'change who is present')
}

/**
 * Puts a Scene into play as the Keeper through the API: a new Player joins the Campaign through its Invite, gets an Approved
 * Investigator, and the Scene is started with it present (finishing any Active Scene first), then finished when `status` is
 * "Finished". The Keeper's `page` is used for the Invite and must be signed in.
 */
export async function playSceneViaApi(
  page: Page,
  browser: Browser,
  keeperBearer: string,
  campaignId: string,
  sceneId: string,
  status: 'Active' | 'Finished',
): Promise<void> {
  const token = await issueInviteViaUi(page, campaignId)
  const player = await joinAsNewPlayer(browser, token, 'Played')
  try {
    const playerBearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
    const investigatorId = await createApprovedInvestigatorViaApi(page.request, keeperBearer, playerBearer, campaignId, 'Harvey Walters')
    await startSceneViaApi(page.request, keeperBearer, campaignId, sceneId, [investigatorId], true)
    if (status === 'Finished') {
      await finishActiveSceneViaApi(page.request, keeperBearer, campaignId)
    }
  } finally {
    await player.context.close()
  }
}

/**
 * Signs the Keeper in, creates a Campaign through the UI, prepares the Scenario through the API, and puts the Scene that carries
 * the links, Handouts, and Item into play (PBI-SPL-001 folded follow-ups). Returns the prepared ids.
 */
export async function preparePlayedScenarioViaApi(page: Page, browser: Browser, label: string, status: 'Active' | 'Finished'): Promise<PreparedScenario> {
  const keeper = newAccount('Keeper')
  await signIn(page, keeper)
  const campaignId = await createCampaignViaUi(page, `${label} ${keeper.oid.slice(0, 6)}`)
  const bearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}`)
  const prepared = await prepareScenarioViaApi(page.request, bearer, campaignId, `secret-${keeper.oid.slice(0, 8)}`)
  await playSceneViaApi(page, browser, bearer, campaignId, prepared.sceneId, status)
  return prepared
}
