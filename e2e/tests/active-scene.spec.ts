import { test, expect } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi } from '../fixtures/campaigns'
import { openAndCaptureBearer } from '../fixtures/investigators'
import { PREPARED, prepareScenarioViaApi } from '../fixtures/prepared-scenario'
import {
  activeSceneCard,
  changePresentViaApi,
  closeTable,
  finishActiveSceneViaApi,
  HARVEY,
  LUCY,
  pageStatus,
  presentFieldset,
  presentSection,
  setUpTable,
  startSceneViaApi,
} from '../fixtures/scene-play'
import { sceneLinks, scenesSection } from '../fixtures/scenes'
import { openWall, wallEntry } from '../fixtures/wall'

/**
 * Traces to specs/scene-play/spec.md Scenarios and to specs/scene-play/ux.md (PBI-SPL-001):
 * - "Keeper starts a Scene" (SPL-UX-1, 2, 9, 16)
 * - "Scenes can be started out of prepared order" (SPL-UX-3)
 * - "A second Active Scene is refused" (SPL-UX-5)
 * - "Keeper finishes the current Scene and starts the next one" (SPL-UX-6, 16)
 * - "Starting a Scene reveals nothing" (SPL-UX-12, amended by PBI-SPL-002: no Handout before any Reveal)
 * - the Keeper's material list on the Active Scene page (SPL-UX-9, amended by PBI-SPL-002, SPL-UX-20, SPL-UX-25)
 * - "A Player whose Investigator is not present sees only the title" (SPL-UX-13)
 * - "Players cannot run Scenes" (SPL-UX-17)
 * - changing who is present (SPL-UX-10), finishing (SPL-UX-11), an empty selection and no Approved Investigator (SPL-UX-4, 8),
 *   and the overview card with live updates for a connected Player (SPL-UX-14, 15).
 * Exceptions, covered by integration tests (ActiveSceneApiTests, ScenePlayAuthorizationMatrixTests, SceneLifecycleSqlServerTests):
 * - "Concurrent starts leave one Active Scene" and the raced 409 (SPL-UX-7) need simultaneous requests.
 * - "Only Approved Investigators can be present" (400): the UI never offers an unapproved Investigator.
 * - "Scene Play stays within its Campaign": covered by the matrix and by the Campaign isolation integration test.
 */

const CORBITT = PREPARED.firstSceneTitle
const KNOTT = PREPARED.secondSceneTitle

/** Each Investigator present is followed by its "Clues" link (SPL-UX-33), so a list item starts with the name. */
const startingWith = (...names: string[]): RegExp[] => names.map((name) => new RegExp(`^${name}`))

test.describe('Starting and finishing a Scene', () => {
  // Each journey signs in a Keeper and joins Players in isolated contexts before it checks anything, which takes longer than the default.
  test.describe.configure({ timeout: 240_000 })
  test('Keeper starts a Scene with both Investigators present and the Wall names it', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Start')
    const { prepared } = table

    try {
      await test.step('SPL-UX-1, SPL-UX-2: the Prepared Scene offers Start Scene, and the start page lists the Approved Investigators, all checked', async () => {
        await page.goto(prepared.scenePath)
        await page.getByRole('link', { name: 'Start Scene' }).click()
        await expect(page).toHaveURL(`${prepared.scenePath}/start`)
        await expect(page.getByRole('heading', { level: 1, name: `Start ${CORBITT}` })).toBeVisible()
        await expect(page.getByText(`Scenario: ${PREPARED.scenarioTitle}`)).toBeVisible()
        await expect(presentFieldset(page).getByRole('checkbox')).toHaveCount(2)
        await expect(presentFieldset(page).getByRole('checkbox', { name: new RegExp(HARVEY) })).toBeChecked()
        await expect(presentFieldset(page).getByRole('checkbox', { name: new RegExp(LUCY) })).toBeChecked()
      })

      await test.step('SPL-UX-2, SPL-UX-9: starting opens the Active Scene page with its header, controls, and material (Keeper notes collapsed)', async () => {
        await page.getByRole('button', { name: 'Start Scene' }).click()
        await expect(page).toHaveURL(`/campaigns/${prepared.campaignId}/active-scene`)
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await expect(pageStatus(page)).toHaveText(`${CORBITT} started.`)
        await expect(page.getByText('Active', { exact: true })).toBeVisible()
        await expect(page.getByText(`Scenario: ${PREPARED.scenarioTitle}`)).toBeVisible()
        await expect(presentSection(page).getByRole('listitem')).toHaveText(startingWith(HARVEY, LUCY))
        await expect(page.getByRole('button', { name: 'Change' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Finish Scene' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Open in Scenario' })).toBeVisible()
        expect(await page.locator('body').innerText(), 'the Keeper notes stay collapsed until shown').not.toContain('Scene notes')
      })

      await test.step('SPL-UX-9, SPL-UX-20: the Keeper notes, Handouts, and Non-Player Entities are listed, and Reveal... is offered on Player-facing material only', async () => {
        await expect(page.getByRole('button', { name: 'Show Keeper notes' })).toBeVisible()
        const handouts = page.getByRole('region', { name: 'Handouts' })
        await expect(handouts.getByRole('heading', { level: 3 })).toHaveText(PREPARED.handouts.map((handout) => handout.title))
        await expect(handouts.getByRole('button', { name: /^Reveal / })).toHaveCount(2)
        await expect(handouts.getByRole('button', { name: `Reveal ${PREPARED.handouts[0].title}` })).toBeVisible()
        await expect(handouts.getByRole('button', { name: `Reveal ${PREPARED.handouts[1].title}` })).toHaveCount(0)
        const entities = page.getByRole('region', { name: 'Non-Player Entities' })
        await expect(entities.getByRole('heading', { level: 3 })).toHaveText([PREPARED.humanNpcLinkName, PREPARED.creatureLinkName])
        await page.getByRole('button', { name: 'Show Keeper notes' }).click()
        await expect(page.getByText(`Scene notes ${prepared.secret}`)).toBeVisible()
      })

      await test.step('SPL-UX-25 as amended: a Handout title opens its content in the side panel', async () => {
        const handouts = page.getByRole('region', { name: 'Handouts' })
        await handouts.getByRole('button', { name: PREPARED.handouts[1].title, exact: true }).click()
        const panel = page.getByRole('dialog', { name: PREPARED.handouts[1].title })
        await expect(panel).toBeVisible()
        await expect(panel.getByText(`${PREPARED.handouts[1].title} ${prepared.secret}`, { exact: true })).toBeVisible()
        await page.screenshot({ path: test.info().outputPath('keeper-handout-panel.png') })
        await page.screenshot({ path: '../docs/scene-play/screenshots/spl-005-active-scene.png' })
        await panel.getByRole('button', { name: 'Close' }).click()
        await expect(panel).toBeHidden()
      })

      await test.step('SP-UX-108: an entity title opens What Players see and the Profile', async () => {
        const entities = page.getByRole('region', { name: 'Non-Player Entities' })
        await entities.getByRole('button', { name: PREPARED.creatureLinkName, exact: true }).click()
        const panel = page.getByRole('dialog', { name: PREPARED.creatureLinkName })
        await expect(panel.getByRole('heading', { name: 'What Players see' })).toBeVisible()
        await expect(panel.getByRole('heading', { name: 'Profile' })).toBeVisible()
        await expect(panel.getByRole('heading', { name: PREPARED.creatureName })).toBeVisible()
        await panel.getByRole('button', { name: 'Close' }).click()
        await expect(panel).toBeHidden()
      })

      await test.step('SPL-UX-16: the Wall has a Public entry naming the Scene, which a Player sees', async () => {
        await openWall(table.harvey.page, prepared.campaignId)
        await expect(wallEntry(table.harvey.page, `Scene started: ${CORBITT}`)).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper cannot start a Scene without choosing an Investigator present', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Empty')

    try {
      await page.goto(`${table.prepared.scenePath}/start`)
      await expect(presentFieldset(page).getByRole('checkbox')).toHaveCount(2)

      await test.step('SPL-UX-4: with nothing checked, Start Scene shows the message and starts nothing', async () => {
        await presentFieldset(page).getByRole('checkbox', { name: new RegExp(HARVEY) }).uncheck()
        await presentFieldset(page).getByRole('checkbox', { name: new RegExp(LUCY) }).uncheck()
        await page.getByRole('button', { name: 'Start Scene' }).click()
        await expect(presentFieldset(page)).toContainText('Choose at least one Investigator present.')
        await expect(presentFieldset(page).getByRole('checkbox', { name: new RegExp(HARVEY) })).toBeFocused()
        await expect(page).toHaveURL(`${table.prepared.scenePath}/start`)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper sees that no Investigator is Approved yet, and cannot start', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `NoApproved ${keeper.oid.slice(0, 6)}`)
    const bearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}`)
    const prepared = await prepareScenarioViaApi(page.request, bearer, campaignId, `secret-${keeper.oid.slice(0, 8)}`)

    await page.goto(`${prepared.scenePath}/start`)

    await test.step('SPL-UX-8: the page says so and offers no Start Scene', async () => {
      await expect(page.getByText('No Investigator is Approved yet. Approve an Investigator before starting a Scene.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Start Scene' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Back to your Campaign' })).toBeVisible()
    })
  })

  test('Scenes can be started out of prepared order', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Order')

    try {
      await page.goto(`${table.prepared.scenePath}/start`)
      await page.getByRole('button', { name: 'Start Scene' }).click()
      await expect(page).toHaveURL(`/campaigns/${table.prepared.campaignId}/active-scene`)

      await test.step(`SPL-UX-3: ${CORBITT} is Active and ${KNOTT}, listed before it, is still Prepared`, async () => {
        await page.goto(table.prepared.scenarioPath)
        await expect(sceneLinks(page)).toHaveText([KNOTT, CORBITT])
        await expect(scenesSection(page).getByRole('listitem').filter({ hasText: KNOTT })).toContainText('Prepared')
        await expect(scenesSection(page).getByRole('listitem').filter({ hasText: CORBITT })).toContainText('Active')
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A second Active Scene is refused until the Keeper chooses to finish the first', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Second')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.meetingKnottId, [table.harveyId])

    try {
      await page.goto(`${table.prepared.scenePath}/start`)

      await test.step('SPL-UX-5: the notice names the Active Scene, its box is unchecked, and submitting without it changes nothing', async () => {
        await expect(page.getByRole('heading', { level: 2, name: `${KNOTT} is the Active Scene` })).toBeVisible()
        const finishFirst = page.getByRole('checkbox', { name: `Finish ${KNOTT} first` })
        await expect(finishFirst).not.toBeChecked()
        await expect(presentFieldset(page).getByRole('checkbox', { name: new RegExp(HARVEY) })).toBeChecked()
        await expect(presentFieldset(page).getByRole('checkbox', { name: new RegExp(LUCY) })).not.toBeChecked()
        await page.getByRole('button', { name: 'Start Scene' }).click()
        await expect(finishFirst).toHaveAccessibleDescription(`Choose to finish ${KNOTT} first, or cancel.`)
        await expect(finishFirst).toBeFocused()
        await expect(page).toHaveURL(`${table.prepared.scenePath}/start`)
      })

      await test.step('both Scenes keep their status', async () => {
        await page.goto(table.prepared.scenarioPath)
        await expect(scenesSection(page).getByRole('listitem').filter({ hasText: KNOTT })).toContainText('Active')
        await expect(scenesSection(page).getByRole('listitem').filter({ hasText: CORBITT })).toContainText('Prepared')
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper finishes the current Scene and starts the next one', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Next')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.meetingKnottId, [table.harveyId])

    try {
      await page.goto(`${table.prepared.scenePath}/start`)

      await test.step('SPL-UX-6: choosing to finish the Active Scene first starts the new Scene', async () => {
        await page.getByRole('checkbox', { name: `Finish ${KNOTT} first` }).check()
        await presentFieldset(page).getByRole('checkbox', { name: new RegExp(LUCY) }).check()
        await page.getByRole('button', { name: 'Start Scene' }).click()
        await expect(page).toHaveURL(`/campaigns/${table.prepared.campaignId}/active-scene`)
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await expect(presentSection(page).getByRole('listitem')).toHaveText(startingWith(HARVEY, LUCY))
      })

      await test.step('the old Scene is Finished and the new one Active', async () => {
        await page.goto(table.prepared.scenarioPath)
        await expect(scenesSection(page).getByRole('listitem').filter({ hasText: KNOTT })).toContainText('Finished')
        await expect(scenesSection(page).getByRole('listitem').filter({ hasText: CORBITT })).toContainText('Active')
      })

      await test.step('SPL-UX-16: the Wall has an entry for each', async () => {
        await openWall(table.lucy.page, table.prepared.campaignId)
        await expect(wallEntry(table.lucy.page, `Scene finished: ${KNOTT}`)).toBeVisible()
        await expect(wallEntry(table.lucy.page, `Scene started: ${CORBITT}`)).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper changes who is present in the Active Scene', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Change')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
    const activePath = `/campaigns/${table.prepared.campaignId}/active-scene`

    try {
      await page.goto(activePath)
      await page.getByRole('button', { name: 'Change' }).click()

      await test.step('SPL-UX-10: an empty selection shows the message and saves nothing', async () => {
        await presentFieldset(page).getByRole('checkbox', { name: new RegExp(HARVEY) }).uncheck()
        await presentFieldset(page).getByRole('checkbox', { name: new RegExp(LUCY) }).uncheck()
        await page.getByRole('button', { name: 'Save' }).click()
        await expect(presentFieldset(page)).toContainText('Choose at least one Investigator present.')
      })

      await test.step('Cancel keeps the old list', async () => {
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(presentSection(page).getByRole('listitem')).toHaveText(startingWith(HARVEY, LUCY))
        await expect(page.getByRole('button', { name: 'Change' })).toBeFocused()
      })

      await test.step('SPL-UX-10: a different selection is saved and survives a reload', async () => {
        await page.getByRole('button', { name: 'Change' }).click()
        await presentFieldset(page).getByRole('checkbox', { name: new RegExp(HARVEY) }).uncheck()
        await page.getByRole('button', { name: 'Save' }).click()
        await expect(pageStatus(page)).toHaveText('Investigators present saved.')
        await expect(presentSection(page).getByRole('listitem')).toHaveText(startingWith(LUCY))
        await page.reload()
        await expect(presentSection(page).getByRole('listitem')).toHaveText(startingWith(LUCY))
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper finishes the Active Scene', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Finish')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId])
    const activePath = `/campaigns/${table.prepared.campaignId}/active-scene`

    try {
      await page.goto(activePath)

      await test.step('SPL-UX-11: Cancel in the dialog keeps the Scene Active', async () => {
        await page.getByRole('button', { name: 'Finish Scene' }).click()
        const dialog = page.getByRole('alertdialog', { name: `Finish ${CORBITT}?` })
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(dialog).toBeHidden()
        await expect(page.getByRole('button', { name: 'Finish Scene' })).toBeFocused()
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
      })

      await test.step('SPL-UX-11: confirming finishes it and shows No Active Scene', async () => {
        await page.getByRole('button', { name: 'Finish Scene' }).click()
        await page.getByRole('alertdialog').getByRole('button', { name: 'Finish Scene' }).click()
        await expect(page.getByRole('heading', { level: 1, name: 'No Active Scene' })).toBeVisible()
        await expect(pageStatus(page)).toHaveText(`${CORBITT} finished.`)
        await expect(page.getByRole('heading', { level: 1, name: 'No Active Scene' })).toBeFocused()
      })

      await test.step("the Scene's own page shows Finished and neither run link", async () => {
        await page.goto(table.prepared.scenePath)
        await expect(page.getByText('Finished', { exact: true })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Start Scene' })).toHaveCount(0)
        await expect(page.getByRole('link', { name: 'Open Active Scene' })).toHaveCount(0)
      })

      await test.step('SPL-UX-16: the Wall has the finish entry', async () => {
        await openWall(table.harvey.page, table.prepared.campaignId)
        await expect(wallEntry(table.harvey.page, `Scene finished: ${CORBITT}`)).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('The Scene page links to the Active Scene while it is Active', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Link')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId])

    try {
      await page.goto(table.prepared.scenePath)

      await test.step('SPL-UX-1: Open Active Scene replaces Start Scene', async () => {
        await expect(page.getByRole('link', { name: 'Start Scene' })).toHaveCount(0)
        await page.getByRole('link', { name: 'Open Active Scene' }).click()
        await expect(page).toHaveURL(`/campaigns/${table.prepared.campaignId}/active-scene`)
      })
    } finally {
      await closeTable(table)
    }
  })
})

test.describe('What Players see of the Active Scene', () => {
  // Each journey signs in a Keeper and joins Players in isolated contexts before it checks anything, which takes longer than the default.
  test.describe.configure({ timeout: 240_000 })
  test('A present Player sees the Scene without any of its content, and another Player sees only the title', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Players')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId])
    const activePath = `/campaigns/${table.prepared.campaignId}/active-scene`
    const { secret } = table.prepared

    try {
      await test.step('SPL-UX-12: the present Player sees title, location, who is present, and that nothing was revealed (no Handout before any Reveal)', async () => {
        await table.harvey.page.goto(activePath)
        await expect(table.harvey.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await expect(table.harvey.page.getByText(`Arkham ${secret}`)).toBeVisible()
        await expect(table.harvey.page.getByText(`${HARVEY} (your Investigator)`)).toBeVisible()
        await expect(table.harvey.page.getByText(`The Keeper hasn't revealed anything to ${HARVEY} yet.`)).toBeVisible()
        const body = await table.harvey.page.locator('body').innerText()
        expect(body, 'no Handout, note, or Non-Player Entity is shown').not.toContain('The front door')
        expect(body).not.toContain('Scene notes')
        expect(body).not.toContain(PREPARED.humanNpcLinkName)
        expect(body).not.toContain(LUCY)
      })

      await test.step('SPL-UX-13: a Player whose Investigator is not present sees only the title and that it is in progress', async () => {
        await table.lucy.page.goto(activePath)
        await expect(table.lucy.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await expect(table.lucy.page.getByText("This Scene is in progress. You aren't taking part in it.")).toBeVisible()
        const body = await table.lucy.page.locator('body').innerText()
        expect(body, 'no location or other Investigator is shown').not.toContain('Arkham')
        expect(body).not.toContain(HARVEY)
        expect(body).not.toContain(secret)
      })

      await test.step('SPL-UX-13: the overview card says the same, with no link', async () => {
        await table.lucy.page.goto(`/campaigns/${table.prepared.campaignId}`)
        await expect(activeSceneCard(table.lucy.page)).toContainText(`${CORBITT} is in progress. You aren't taking part in it.`)
        await expect(activeSceneCard(table.lucy.page).getByRole('link')).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Players cannot run Scenes', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Forbidden')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId])
    const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${table.prepared.campaignId}/active-scene`)

    try {
      await test.step('SPL-UX-17: the start URL is not found for a Player', async () => {
        await table.harvey.page.goto(`${table.prepared.scenePath}/start`)
        await expect(table.harvey.page.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeVisible()
      })

      await test.step('SPL-UX-17: the Active Scene page has no Keeper controls', async () => {
        await table.harvey.page.goto(`/campaigns/${table.prepared.campaignId}/active-scene`)
        await expect(table.harvey.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        for (const name of ['Change', 'Finish Scene']) {
          await expect(table.harvey.page.getByRole('button', { name })).toHaveCount(0)
        }
        await expect(table.harvey.page.getByRole('link', { name: 'Open in Scenario' })).toHaveCount(0)
      })

      await test.step('Players cannot start, finish, or change who is present through the API: 404 and nothing changes', async () => {
        const base = `https://localhost:5059/api/campaigns/${table.prepared.campaignId}`
        const start = await page.request.post(`${base}/scenes/${table.meetingKnottId}/start`, {
          headers: { Authorization: harveyBearer },
          data: { presentInvestigatorIds: [table.harveyId], finishActiveScene: true },
        })
        const finish = await page.request.post(`${base}/active-scene/finish`, { headers: { Authorization: harveyBearer } })
        expect([start.status(), finish.status()]).toEqual([404, 404])
        await page.goto(`/campaigns/${table.prepared.campaignId}/active-scene`)
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A connected Player sees the Active Scene card appear, change, and disappear without reloading', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Live')
    const { campaignId } = table.prepared
    const harveyPage = table.harvey.page
    const lucyPage = table.lucy.page

    try {
      await test.step('SPL-UX-14: with no Active Scene the overview has no card for the Keeper or the Players', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await harveyPage.goto(`/campaigns/${campaignId}`)
        await lucyPage.goto(`/campaigns/${campaignId}`)
        await expect(harveyPage.getByRole('region', { name: 'At the table' })).toBeVisible()
        await expect(lucyPage.getByRole('region', { name: 'At the table' })).toBeVisible()
        await expect(page.getByRole('region', { name: 'At the table' })).toBeVisible()
        for (const view of [page, harveyPage, lucyPage]) {
          await expect(activeSceneCard(view)).toHaveCount(0)
        }
      })

      await test.step('SPL-UX-15: starting shows the card to everyone, differently for a present and a not present Player', async () => {
        await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId])
        await expect(activeSceneCard(harveyPage)).toContainText(`Investigators present: ${HARVEY} (your Investigator)`)
        await expect(activeSceneCard(harveyPage).getByRole('link', { name: 'Open Active Scene' })).toBeVisible()
        await expect(activeSceneCard(lucyPage)).toContainText(`${CORBITT} is in progress. You aren't taking part in it.`)
        await expect(activeSceneCard(page)).toContainText(`Investigators present: ${HARVEY}`)
      })

      await test.step('SPL-UX-15: changing who is present updates the cards', async () => {
        await changePresentViaApi(page.request, table.keeperBearer, campaignId, [table.lucyId])
        await expect(activeSceneCard(harveyPage)).toContainText(`${CORBITT} is in progress. You aren't taking part in it.`)
        await expect(activeSceneCard(lucyPage)).toContainText(`Investigators present: ${LUCY} (your Investigator)`)
      })

      await test.step('SPL-UX-15: finishing removes the card', async () => {
        await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)
        for (const view of [page, harveyPage, lucyPage]) {
          await expect(activeSceneCard(view)).toHaveCount(0)
        }
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A connected Player on the Active Scene page hears when their Investigator joins the Scene', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Hear')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId])

    try {
      await table.lucy.page.goto(`/campaigns/${campaignId}/active-scene`)
      await expect(table.lucy.page.getByText("This Scene is in progress. You aren't taking part in it.")).toBeVisible()

      await test.step('SPL-UX-15, SPL-A11Y-5: adding the Investigator changes the view and is announced politely', async () => {
        await changePresentViaApi(page.request, table.keeperBearer, campaignId, [table.harveyId, table.lucyId])
        await expect(table.lucy.page.getByText(`${LUCY} (your Investigator)`)).toBeVisible()
        await expect(pageStatus(table.lucy.page)).toHaveText(`You're now taking part in ${CORBITT}.`)
      })
    } finally {
      await closeTable(table)
    }
  })
})
