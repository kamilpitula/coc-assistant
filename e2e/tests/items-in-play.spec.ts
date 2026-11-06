import { test, expect, type Locator, type Page } from '@playwright/test'

import { recordHubFrames } from '../fixtures/hub'
import { API_ORIGIN, openAndCaptureBearer } from '../fixtures/investigators'
import { PREPARED } from '../fixtures/prepared-scenario'
import {
  activeScenePath,
  closeTable,
  finishActiveSceneViaApi,
  HARVEY,
  LUCY,
  pageStatus,
  referencePath,
  revealButton,
  revealDialog,
  revealedInScene,
  revealedPath,
  revealedToSection,
  setUpTable,
  startSceneViaApi,
  toRevealPath,
  type Table,
} from '../fixtures/scene-play'

/**
 * Traces to specs/scene-play/spec.md Scenarios ("giving and taking back an Item") and to specs/scene-play/ux.md section 22
 * (PBI-SPL-003):
 * - "Keeper gives an Item to an Investigator" (SPL-UX-52, SPL-UX-57)
 * - "Keeper takes an Item back" (SPL-UX-54)
 * - "Giving a held Item to another Investigator moves it" (SPL-UX-53)
 * - "Taking an Item back needs no Active Scene" (SPL-UX-55)
 * - "Keeper reveals an Item without giving it" and "Keeper reveals an Item's Handout" (SPL-UX-51)
 * - "A Player cannot give an Item" (authorization matrix)
 * - "A held Item cannot be deleted" (closes the PBI-SP-008 E2E exception)
 * - "An Item in a played Scene cannot be deleted" (the PBI-SPL-001 follow-up)
 * Each journey signs in a Keeper and joins Players in isolated contexts, which takes longer than the default.
 */
test.describe.configure({ timeout: 240_000 })

const ITEM = PREPARED.itemName
const ITEM_HANDOUT = PREPARED.itemHandouts[0]
const PLAYER_CLUES = (campaignId: string): string => `/campaigns/${campaignId}/investigator/clues`
const KEEPER_CLUES = (campaignId: string, investigatorId: string): string => `/campaigns/${campaignId}/investigators/${investigatorId}/clues`

async function startCorbitt(page: Page, table: Table, present: string[]): Promise<void> {
  await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, present)
}

async function giveViaApi(page: Page, campaignId: string, itemId: string, bearer: string, investigatorId: string): Promise<void> {
  const response = await page.request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/items/${itemId}/give`, {
    headers: { Authorization: bearer },
    data: { investigatorId },
  })
  expect(response.status(), 'POST give').toBe(200)
}

function giveButton(page: Page): Locator {
  return page.getByRole('button', { name: `Give ${ITEM}`, exact: true })
}

function giveDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: `Give ${ITEM}`, exact: true })
}

function takeBackButton(page: Page): Locator {
  return page.getByRole('button', { name: `Take back ${ITEM}`, exact: true })
}

function takeBackDialog(page: Page, holder: string): Locator {
  return page.getByRole('alertdialog', { name: `Take ${ITEM} back from ${holder}?`, exact: true })
}

/** The "Items {name} holds" section, which a Player and the Keeper both see. */
function heldSection(page: Page, name: string): Locator {
  return page.getByRole('region', { name: `Items ${name} holds`, exact: true })
}

/**
 * A Clue article on a Clues page, scoped to its Scene group: the page also renders the Item in the "Items {name}
 * holds" section, so an unscoped article locator is ambiguous.
 */
function clueArticle(page: Page, title: string): Locator {
  return page.getByRole('region', { name: PREPARED.firstSceneTitle, exact: true }).getByRole('article', { name: title, exact: true })
}

test.describe('Giving and taking back Items', () => {
  test('Keeper gives an Item to an Investigator, who sees it live among Items and Clues', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'GiveItem')
    const { campaignId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    const harveyFrames = await recordHubFrames(table.harvey.page)
    const lucyFrames = await recordHubFrames(table.lucy.page)

    try {
      await table.harvey.page.goto(activeScenePath(campaignId))
      await expect(table.harvey.page.getByText(`${HARVEY} doesn't hold any Items.`)).toBeVisible()
      await table.lucy.page.goto(activeScenePath(campaignId))
      await expect(table.lucy.page.getByText(`${LUCY} doesn't hold any Items.`)).toBeVisible()
      await page.goto(toRevealPath(campaignId))

      await test.step('SPL-UX-52: the Keeper gives the Item from To reveal to Harvey alone', async () => {
        const items = page.getByRole('region', { name: 'Items', exact: true })
        await expect(items.getByRole('button', { name: ITEM, exact: true })).toBeVisible()
        await giveButton(page).click()
        const dialog = giveDialog(page)
        await expect(dialog).toBeVisible()
        await dialog.getByRole('radio', { name: HARVEY, exact: true }).check()
        await dialog.getByRole('button', { name: 'Give', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(pageStatus(page)).toHaveText(`${ITEM} given to ${HARVEY}.`)
      })

      await test.step('SPL-UX-52, SPL-UX-57: Harvey sees it under "Items Harvey Walters holds" and among the Clues, without reloading', async () => {
        const harveyItems = heldSection(table.harvey.page, HARVEY)
        await expect(harveyItems).toBeVisible()
        const article = harveyItems.getByRole('article', { name: ITEM })
        await expect(article.getByRole('button', { name: `Show ${ITEM}`, exact: true })).toBeVisible()
        await expect(article.getByText(/^Given/)).toBeVisible()

        await table.harvey.page.goto(PLAYER_CLUES(campaignId))
        await expect(heldSection(table.harvey.page, HARVEY)).toBeVisible()
        await expect(clueArticle(table.harvey.page, ITEM)).toBeVisible()
      })

      await test.step('SPL-UX-57: Lucy receives nothing, and only Harvey hears myItems and myClues', async () => {
        await expect(table.lucy.page.getByText(`${LUCY} doesn't hold any Items.`)).toBeVisible()
        expect(harveyFrames.dataChangedTopics().flat(), "Harvey's live signals").toEqual(expect.arrayContaining(['myItems', 'myClues']))
        expect(lucyFrames.dataChangedTopics(), "Lucy's live signals").toEqual([])
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper takes an Item back from Keeper reference, and the Clue stays', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'TakeBack')
    const { campaignId, itemId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    await giveViaApi(page, campaignId, itemId, table.keeperBearer, table.harveyId)

    try {
      await table.harvey.page.goto(activeScenePath(campaignId))
      await expect(heldSection(table.harvey.page, HARVEY)).toBeVisible()

      await test.step('SPL-UX-54: "Take back" on Keeper reference removes the Item from the Player Items without reloading', async () => {
        await page.goto(referencePath(campaignId))
        await takeBackButton(page).click()
        const dialog = takeBackDialog(page, HARVEY)
        await expect(dialog).toBeVisible()
        await expect(dialog).toContainText('keeps it among their Clues.')
        await dialog.getByRole('button', { name: 'Take back', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(pageStatus(page)).toHaveText(`${ITEM} taken back from ${HARVEY}.`)

        await expect(table.harvey.page.getByText(`${HARVEY} doesn't hold any Items.`)).toBeVisible()
      })

      await test.step('SPL-UX-54: Harvey keeps the Clue', async () => {
        await table.harvey.page.goto(PLAYER_CLUES(campaignId))
        await expect(clueArticle(table.harvey.page, ITEM)).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Giving a held Item to another Investigator moves it, and the former holder keeps the Clue', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'MoveItem')
    const { campaignId, itemId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    await giveViaApi(page, campaignId, itemId, table.keeperBearer, table.harveyId)

    try {
      await table.harvey.page.goto(activeScenePath(campaignId))
      await table.lucy.page.goto(activeScenePath(campaignId))
      await expect(heldSection(table.harvey.page, HARVEY)).toBeVisible()

      await test.step('SPL-UX-53: the Keeper gives the held Item to Lucy from To reveal', async () => {
        await page.goto(toRevealPath(campaignId))
        await giveButton(page).click()
        const dialog = giveDialog(page)
        await expect(dialog.getByRole('radio', { name: `${HARVEY} (holds it)` })).toBeDisabled()
        await dialog.getByRole('radio', { name: LUCY, exact: true }).check()
        await dialog.getByRole('button', { name: 'Give', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(pageStatus(page)).toHaveText(`${ITEM} given to ${LUCY}. Moved to Revealed.`)
      })

      await test.step("SPL-UX-53: both Players' Items update without reloading, and Harvey keeps the Clue", async () => {
        await expect(heldSection(table.lucy.page, LUCY).getByRole('article', { name: ITEM })).toBeVisible()
        await expect(table.harvey.page.getByText(`${HARVEY} doesn't hold any Items.`)).toBeVisible()

        await table.harvey.page.goto(PLAYER_CLUES(campaignId))
        await expect(clueArticle(table.harvey.page, ITEM)).toBeVisible()
        await table.lucy.page.goto(PLAYER_CLUES(campaignId))
        await expect(clueArticle(table.lucy.page, ITEM)).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Keeper takes an Item back from the Clues page with no Active Scene', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'TakeBackNoScene')
    const { campaignId, itemId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    await giveViaApi(page, campaignId, itemId, table.keeperBearer, table.harveyId)
    await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)

    try {
      await test.step("SPL-UX-55: 'Take back' on the Keeper's Clues page works with no Active Scene", async () => {
        await page.goto(KEEPER_CLUES(campaignId, table.harveyId))
        await expect(heldSection(page, HARVEY)).toBeVisible()
        await takeBackButton(page).click()
        const dialog = takeBackDialog(page, HARVEY)
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Take back', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(pageStatus(page)).toHaveText(`${ITEM} taken back from ${HARVEY}.`)
        await expect(page.getByText(`${HARVEY} doesn't hold any Items.`)).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test("Keeper reveals an Item and its Handout without giving them, and a Player cannot give an Item", async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealItem')
    const { campaignId, itemId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${campaignId}`)

    try {
      await table.harvey.page.goto(activeScenePath(campaignId))

      await test.step("SPL-UX-51: 'Reveal...' on an Item reveals only its name and Player-facing description", async () => {
        await page.goto(toRevealPath(campaignId))
        const items = page.getByRole('region', { name: 'Items', exact: true })
        await expect(items.getByRole('button', { name: ITEM, exact: true })).toBeVisible()

        await revealButton(page, ITEM).click()
        const dialog = revealDialog(page, ITEM)
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(pageStatus(page)).toHaveText(`${ITEM} revealed to ${HARVEY} and ${LUCY}. Moved to Revealed.`)

        const article = revealedToSection(table.harvey.page, HARVEY).getByRole('article', { name: ITEM })
        await expect(article).toContainText('Item')
        await expect(table.harvey.page.getByText(`${HARVEY} doesn't hold any Items.`)).toBeVisible()
      })

      await test.step("SPL-UX-51: the Item's Player-facing Handout reveals on its own, naming its Item", async () => {
        await page.goto(toRevealPath(campaignId))
        const items = page.getByRole('region', { name: 'Items', exact: true })
        await expect(items.getByText(`Item: ${ITEM}`)).toBeVisible()

        await revealButton(page, ITEM_HANDOUT).click()
        const dialog = revealDialog(page, ITEM_HANDOUT)
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
        await expect(dialog).toBeHidden()

        const handoutArticle = revealedToSection(table.harvey.page, HARVEY).getByRole('article', { name: ITEM_HANDOUT })
        await expect(handoutArticle).toBeVisible()
      })

      await test.step('A Player giving through the API is answered 404 and nothing changes', async () => {
        const response = await page.request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/items/${itemId}/give`, {
          headers: { Authorization: harveyBearer },
          data: { investigatorId: table.harveyId },
        })
        expect(response.status(), 'a Player give').toBe(404)
        await expect(table.harvey.page.getByText(`${HARVEY} doesn't hold any Items.`)).toBeVisible()
      })

      await test.step('The Revealed sub-tab names the Item Reveal "Item . {time} . to {names}" (SPL-UX-51)', async () => {
        await page.goto(revealedPath(campaignId))
        const entry = revealedInScene(page).getByRole('listitem').filter({ hasText: ITEM })
        await expect(entry).toContainText('Item')
        await expect(entry).toContainText(`to ${HARVEY} and ${LUCY}`)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A held Item cannot be deleted', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'HeldDelete')
    const { campaignId, itemId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    await giveViaApi(page, campaignId, itemId, table.keeperBearer, table.harveyId)

    try {
      await test.step("The Item page's Delete dialog says an Investigator holds it, and Delete is disabled", async () => {
        await page.goto(`/campaigns/${campaignId}/items/${itemId}`)
        await page.getByRole('button', { name: 'Delete Item', exact: true }).click()
        const dialog = page.getByRole('alertdialog')
        await dialog.getByRole('button', { name: 'Delete', exact: true }).click()

        await expect(dialog.getByRole('alert')).toHaveText(`${ITEM} is held by an Investigator, so it can't be deleted.`)
        await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('An Item in a Finished Scene cannot be deleted', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'FinishedItem')
    const { campaignId, itemId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)

    try {
      await test.step('The Item page says the Scene has been played, and Delete is disabled', async () => {
        await page.goto(`/campaigns/${campaignId}/items/${itemId}`)
        await page.getByRole('button', { name: 'Delete Item', exact: true }).click()
        const dialog = page.getByRole('alertdialog')
        await dialog.getByRole('button', { name: 'Delete', exact: true }).click()

        await expect(dialog.getByRole('alert')).toHaveText(`${ITEM} is part of a Scene that has been played, so it can't be deleted.`)
        await expect(dialog.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled()
      })
    } finally {
      await closeTable(table)
    }
  })
})
