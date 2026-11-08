import { test, expect } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi } from '../fixtures/campaigns'
import { openAndCaptureBearer } from '../fixtures/investigators'
import { PREPARED, prepareScenarioViaApi } from '../fixtures/prepared-scenario'
import {
  activeSceneCard,
  activeScenePath,
  changePresentViaApi,
  closeTable,
  finishActiveSceneViaApi,
  HARVEY,
  LUCY,
  pageStatus,
  presentFieldset,
  presentSection,
  referencePath,
  revealedPath,
  revealHandoutViaApi,
  setUpTable,
  startSceneViaApi,
  toRevealPath,
} from '../fixtures/scene-play'
import { sceneLinks, scenesSection } from '../fixtures/scenes'
import { addWallEntryViaUi, openWall, wallEntry, wallPreview } from '../fixtures/wall'

/**
 * Traces to specs/scene-play/spec.md Scenarios and to specs/scene-play/ux.md (PBI-SPL-001, PBI-SPL-006):
 * - "Keeper starts a Scene" (SPL-UX-1, 2, 9, 16)
 * - "Scenes can be started out of prepared order" (SPL-UX-3)
 * - "A second Active Scene is refused" (SPL-UX-5)
 * - "Keeper finishes the current Scene and starts the next one" (SPL-UX-6, 16)
 * - "Starting a Scene reveals nothing" (SPL-UX-12, amended by PBI-SPL-002: no Handout before any Reveal)
 * - the Keeper's Run tab and sub-navigation (SPL-UX-40, SPL-UX-41), To reveal (SPL-UX-20, SPL-UX-42),
 *   Keeper reference (SPL-UX-45), and material side panels (SPL-UX-25, SPL-UX-46 as amended by PBI-SPL-006)
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

      await test.step('SPL-UX-2, SPL-UX-9, SPL-UX-40: starting opens the Run tab with its header, controls, and Keeper notes, and no material', async () => {
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
        await expect(page.getByRole('button', { name: 'Hide Keeper notes' })).toBeVisible()
        await expect(page.getByText(`Scene notes ${prepared.secret}`)).toBeVisible()
        await expect(page.getByRole('region', { name: 'Handouts' })).toHaveCount(0)
        await expect(page.getByRole('region', { name: 'Non-Player Entities' })).toHaveCount(0)
        await expect(page.getByRole('button', { name: /^Reveal/ })).toHaveCount(0)
      })

      await test.step('SPL-UX-41: the sub-navigation shows each tab with its count, and Run is current', async () => {
        await expect(page.getByRole('link', { name: 'Run', exact: true })).toHaveAttribute('aria-current', 'page')
        // 2 Player-facing Handouts, 2 Non-Player Entities, the diary Item, and its Player-facing Handout (ux 22.1).
        await expect(page.getByRole('link', { name: 'To reveal, 6' })).toBeVisible()
        // 3 Keeper-facing Handouts, 2 Non-Player Entities, the diary Item, and its Keeper-facing Handout (ux 22.2).
        await expect(page.getByRole('link', { name: 'Keeper reference, 7' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Revealed, 0' })).toBeVisible()
      })

      await test.step('SPL-UX-20, SPL-UX-42: To reveal lists the Player-facing Handouts and Non-Player Entities with "Reveal..."', async () => {
        await page.getByRole('link', { name: 'To reveal, 6' }).click()
        await expect(page).toHaveURL(`/campaigns/${prepared.campaignId}/active-scene/to-reveal`)
        await expect(page.getByRole('link', { name: 'To reveal, 6' })).toHaveAttribute('aria-current', 'page')
        const handouts = page.getByRole('region', { name: 'Handouts' })
        await expect(handouts.getByRole('heading', { level: 4 })).toHaveText([PREPARED.handouts[0].title, PREPARED.handouts[2].title])
        await expect(handouts.getByRole('button', { name: /^Reveal / })).toHaveCount(2)
        await expect(handouts.getByRole('button', { name: `Reveal ${PREPARED.handouts[0].title}` })).toBeVisible()
        await expect(handouts.getByRole('button', { name: `Reveal ${PREPARED.handouts[1].title}` })).toHaveCount(0)
        const entities = page.getByRole('region', { name: 'Non-Player Entities' })
        await expect(entities.getByRole('heading', { level: 4 })).toHaveText([PREPARED.humanNpcLinkName, PREPARED.creatureLinkName])
        await expect(entities.getByRole('button', { name: /^Reveal / })).toHaveCount(2)
      })

      await test.step('SPL-UX-45: Keeper reference lists the Keeper-facing Handouts and every Non-Player Entity with no "Reveal..."', async () => {
        await page.getByRole('link', { name: 'Keeper reference, 7' }).click()
        await expect(page).toHaveURL(`/campaigns/${prepared.campaignId}/active-scene/reference`)
        const handouts = page.getByRole('region', { name: 'Handouts' })
        await expect(handouts.getByRole('heading', { level: 4 })).toHaveText([PREPARED.handouts[1].title, PREPARED.handouts[3].title, PREPARED.handouts[4].title])
        const entities = page.getByRole('region', { name: 'Non-Player Entities' })
        await expect(entities.getByRole('heading', { level: 4 })).toHaveText([PREPARED.humanNpcLinkName, PREPARED.creatureLinkName])
        await expect(page.getByRole('button', { name: /^Reveal/ })).toHaveCount(0)
      })

      await test.step('SPL-UX-25 as amended: a Handout title opens its content in the side panel', async () => {
        await page.getByRole('link', { name: 'Keeper reference, 7' }).click()
        const handouts = page.getByRole('region', { name: 'Handouts' })
        await handouts.getByRole('button', { name: PREPARED.handouts[1].title, exact: true }).click()
        const panel = page.getByRole('dialog', { name: PREPARED.handouts[1].title })
        await expect(panel).toBeVisible()
        await expect(panel.getByText(`${PREPARED.handouts[1].title} ${prepared.secret}`, { exact: true })).toBeVisible()
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

  test('Keeper sub-tab screenshots at desktop and phone widths (PBI-SPL-006)', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Shots')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneHandoutIds[PREPARED.handouts[0].title], [table.harveyId, table.lucyId])

    try {
      await test.step('SPL-UX-40 to SPL-UX-43, SPL-UX-45: each sub-tab at 1366px', async () => {
        await page.setViewportSize({ width: 1366, height: 800 })
        await page.goto(`/campaigns/${campaignId}/active-scene`)
        await expect(page.getByRole('button', { name: 'Hide Keeper notes' })).toBeVisible()
        // The front door reached everyone, so 5 subjects stay (ux 22.1): the plan, the 2 Non-Player Entities,
        // the diary Item, and its Player-facing Handout.
        await expect(page.getByRole('link', { name: 'To reveal, 5' })).toBeVisible()
        await page.screenshot({ path: '../docs/scene-play/screenshots/spl-006-run-1366.png' })
        await page.goto(`/campaigns/${campaignId}/active-scene/to-reveal`)
        await expect(page.getByRole('region', { name: 'Handouts' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'To reveal, 5' })).toBeVisible()
        await page.screenshot({ path: '../docs/scene-play/screenshots/spl-006-to-reveal-1366.png' })
        await page.goto(`/campaigns/${campaignId}/active-scene/reference`)
        await expect(page.getByText("Only you see these: Keeper-facing Handouts, the profiles behind Non-Player Entities, and Items' Keeper notes.")).toBeVisible()
        await expect(page.getByRole('link', { name: 'Keeper reference, 7' })).toBeVisible()
        await page.screenshot({ path: '../docs/scene-play/screenshots/spl-006-reference-1366.png' })
        await page.goto(`/campaigns/${campaignId}/active-scene/revealed`)
        await expect(page.getByRole('region', { name: 'Revealed', exact: true }).getByRole('heading', { level: 3, name: PREPARED.handouts[0].title })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Revealed, 1' })).toBeVisible()
        await page.screenshot({ path: '../docs/scene-play/screenshots/spl-006-revealed-1366.png' })
      })

      await test.step('SPL-A11Y-18: each sub-tab at 375px with no sideways scrolling', async () => {
        await page.setViewportSize({ width: 375, height: 800 })
        for (const tab of ['', '/to-reveal', '/reference', '/revealed']) {
          await page.goto(`/campaigns/${campaignId}/active-scene${tab}`)
          await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
          await expect(page.getByRole('link', { name: 'To reveal, 5' })).toBeVisible()
          const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
          expect(sideways, `no sideways scrolling on ${tab || 'run'}`).toBeLessThanOrEqual(0)
          const file = tab === '' ? 'run' : tab.slice(1)
          await page.screenshot({ path: `../docs/scene-play/screenshots/spl-006-${file}-375.png` })
        }
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Browser back and refresh keep the sub-tab (SPL-UX-41)', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Back')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId])
    const activePath = `/campaigns/${table.prepared.campaignId}/active-scene`

    try {
      await page.goto(activePath)
      await expect(page.getByRole('link', { name: 'Run', exact: true })).toHaveAttribute('aria-current', 'page')
      await page.getByRole('link', { name: 'To reveal, 6' }).click()
      await expect(page).toHaveURL(`${activePath}/to-reveal`)
      await page.getByRole('link', { name: 'Keeper reference, 7' }).click()
      await expect(page).toHaveURL(`${activePath}/reference`)

      await test.step('SPL-UX-41: back moves through the visited sub-tabs with the current link marked', async () => {
        await page.goBack()
        await expect(page).toHaveURL(`${activePath}/to-reveal`)
        await expect(page.getByRole('link', { name: 'To reveal, 6' })).toHaveAttribute('aria-current', 'page')
        await page.goBack()
        await expect(page).toHaveURL(activePath)
        await expect(page.getByRole('link', { name: 'Run', exact: true })).toHaveAttribute('aria-current', 'page')
      })

      await test.step('SPL-UX-41: a reload keeps the sub-tab', async () => {
        await page.goto(`${activePath}/revealed`)
        await page.reload()
        await expect(page).toHaveURL(`${activePath}/revealed`)
        await expect(page.getByRole('heading', { level: 2, name: 'Revealed' })).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper finishes the Active Scene from a sub-tab (SPL-UX-47)', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'FinishSubTab')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId])

    try {
      await page.goto(toRevealPath(table.prepared.campaignId))

      await test.step('SPL-UX-47: "Finish Scene" on To reveal finishes it and shows No Active Scene', async () => {
        await page.getByRole('button', { name: 'Finish Scene' }).click()
        const dialog = page.getByRole('alertdialog', { name: `Finish ${CORBITT}?` })
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Finish Scene' }).click()
        await expect(page.getByRole('heading', { level: 1, name: 'No Active Scene' })).toBeVisible()
        await expect(pageStatus(page)).toHaveText(`${CORBITT} finished.`)
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

  test('A Player opening a Keeper sub-route lands on the Active Scene page with no sub-navigation (SPL-UX-48)', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'PlayerSubRoute')
    await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, [table.harveyId])
    const activePath = `/campaigns/${table.prepared.campaignId}/active-scene`

    try {
      for (const subRoute of [toRevealPath(table.prepared.campaignId), referencePath(table.prepared.campaignId), revealedPath(table.prepared.campaignId)]) {
        await table.harvey.page.goto(subRoute)
        await expect(table.harvey.page).toHaveURL(activePath)
        await expect(table.harvey.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await expect(table.harvey.page.getByRole('link', { name: /^To reveal/ })).toHaveCount(0)
      }
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

/**
 * Traces to specs/scene-play/spec.md Scenarios (PBI-SPL-007):
 * - "The Keeper posts to the Wall from the Active Scene" (SPL-UX-49)
 * - "A Player never sees a Keeper-only Wall Entry on the Active Scene" (SPL-UX-49, WL-UX-12)
 * - Wall placement on Run and the Player view at desktop and phone widths (SPL-UX-50)
 */
test.describe('The Wall on the Active Scene', () => {
  // Each journey signs a Keeper in and joins Players in isolated contexts before it checks anything, which takes longer than the default.
  test.describe.configure({ timeout: 240_000 })

  test('The Keeper posts to the Wall from the Active Scene and a connected Player sees it live (SPL-UX-49)', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'WallPost')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId])
    const activePath = activeScenePath(campaignId)

    try {
      await table.harvey.page.goto(activePath)
      await expect(table.harvey.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()

      await test.step('SPL-UX-49: the Keeper posts from Run and sees the entry at the top with the status', async () => {
        await page.goto(activePath)
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await addWallEntryViaUi(page, 'The front door slams shut.')
        // Newest first (campaign-wall ux sections 2 and 7): the new entry leads the preview.
        await expect(wallPreview(page).getByRole('listitem').first()).toContainText('The front door slams shut.')
        await expect(pageStatus(page)).toHaveText('Wall Entry added.')
      })

      await test.step('SPL-UX-49: the connected Player sees it in the preview without reloading', async () => {
        await expect(wallPreview(table.harvey.page).getByRole('listitem').first()).toContainText('The front door slams shut.')
      })

      await test.step('SPL-UX-49: the entry is on the Wall page too', async () => {
        await openWall(page, campaignId)
        await expect(wallEntry(page, 'The front door slams shut.')).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Player never sees a Keeper-only Wall Entry on the Active Scene (SPL-UX-49, WL-UX-12)', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'WallKeeperOnly')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId])
    const activePath = activeScenePath(campaignId)

    try {
      await test.step('SPL-UX-49: the Keeper posts a Keeper only entry from Run and sees it with the badge', async () => {
        await page.goto(activePath)
        await expect(page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        await addWallEntryViaUi(page, 'Corbitt has noticed Cy.', 'Keeper only')
        await expect(wallEntry(page, 'Corbitt has noticed Cy.').getByText('Keeper only')).toBeVisible()
      })

      await test.step('WL-UX-12: the present Player sees the Wall without the entry and without the visibility choice', async () => {
        await table.harvey.page.goto(activePath)
        await expect(table.harvey.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        const harveyWall = wallPreview(table.harvey.page)
        await expect(harveyWall.getByText(/Scene started/)).toBeVisible()
        await expect(harveyWall.getByText('Corbitt has noticed Cy.')).toHaveCount(0)
        await expect(harveyWall.getByRole('radio', { name: 'Keeper only' })).toHaveCount(0)
      })

      await test.step('WL-UX-12: the absent Player sees the Wall without the entry', async () => {
        await table.lucy.page.goto(activePath)
        await expect(table.lucy.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        const lucyWall = wallPreview(table.lucy.page)
        await expect(lucyWall.getByText(/Scene started/)).toBeVisible()
        await expect(lucyWall.getByText('Corbitt has noticed Cy.')).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Wall placement on Run and the Player view at desktop and phone widths (SPL-UX-50)', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'WallShots')
    const { campaignId } = table.prepared
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
    const activePath = activeScenePath(campaignId)

    try {
      await test.step('SPL-UX-50: at 1366px the Keeper Wall sits above Investigators present in the right column', async () => {
        await page.setViewportSize({ width: 1366, height: 800 })
        await page.goto(activePath)
        await expect(wallPreview(page).getByRole('listitem').first()).toBeVisible()
        const notes = await page.getByRole('region', { name: 'Keeper notes' }).boundingBox()
        const present = await presentSection(page).boundingBox()
        const wall = await wallPreview(page).boundingBox()
        expect(notes).not.toBeNull()
        expect(present).not.toBeNull()
        expect(wall).not.toBeNull()
        if (notes && present && wall) {
          expect(wall.y, 'the Wall is above Investigators present').toBeLessThan(present.y)
          expect(wall.x, 'the Wall is in the right column, next to Keeper notes').toBeGreaterThan(notes.x)
        }
        await page.screenshot({ path: '../docs/scene-play/screenshots/spl-007-run-1366.png' })
      })

      await test.step('SPL-UX-50: at 375px Run is one column in the order Keeper notes, Investigators present, Wall', async () => {
        await page.setViewportSize({ width: 375, height: 800 })
        await page.goto(activePath)
        await expect(wallPreview(page).getByRole('link', { name: 'Open the Wall' })).toBeVisible()
        const notes = await page.getByRole('region', { name: 'Keeper notes' }).boundingBox()
        const present = await presentSection(page).boundingBox()
        const wall = await wallPreview(page).boundingBox()
        expect(notes).not.toBeNull()
        expect(present).not.toBeNull()
        expect(wall).not.toBeNull()
        if (notes && present && wall) {
          expect(present.y, 'Investigators present is below Keeper notes').toBeGreaterThan(notes.y)
          expect(wall.y, 'the Wall is last').toBeGreaterThan(present.y)
        }
        const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(sideways, 'no sideways scrolling').toBeLessThanOrEqual(0)
        await page.screenshot({ path: '../docs/scene-play/screenshots/spl-007-run-375.png' })
      })

      await test.step('SPL-UX-50: the Player view keeps the Wall on the right at 1366px and last at 375px', async () => {
        await table.harvey.page.setViewportSize({ width: 1366, height: 800 })
        await table.harvey.page.goto(activePath)
        await expect(table.harvey.page.getByRole('heading', { level: 1, name: CORBITT })).toBeVisible()
        const wall1366 = await wallPreview(table.harvey.page).boundingBox()
        const title1366 = await table.harvey.page.getByRole('heading', { level: 1, name: CORBITT }).boundingBox()
        expect(wall1366).not.toBeNull()
        expect(title1366).not.toBeNull()
        if (wall1366 && title1366) {
          expect(wall1366.x, 'the Wall is in the right column').toBeGreaterThan(title1366.x)
        }
        await table.harvey.page.screenshot({ path: '../docs/scene-play/screenshots/spl-007-player-1366.png' })

        await table.harvey.page.setViewportSize({ width: 375, height: 800 })
        await table.harvey.page.goto(activePath)
        const title375 = await table.harvey.page.getByRole('heading', { level: 1, name: CORBITT }).boundingBox()
        const wall375 = await wallPreview(table.harvey.page).boundingBox()
        expect(title375).not.toBeNull()
        expect(wall375).not.toBeNull()
        if (title375 && wall375) {
          expect(wall375.y, 'the Wall is last').toBeGreaterThan(title375.y)
        }
        const sideways = await table.harvey.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(sideways, 'no sideways scrolling').toBeLessThanOrEqual(0)
        await table.harvey.page.screenshot({ path: '../docs/scene-play/screenshots/spl-007-player-375.png' })
      })
    } finally {
      await closeTable(table)
    }
  })
})
