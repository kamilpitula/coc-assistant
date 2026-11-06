import { test, expect, type Locator, type Page } from '@playwright/test'

import { recordHubFrames } from '../fixtures/hub'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { PREPARED } from '../fixtures/prepared-scenario'
import { textDocument } from '../fixtures/scene-handouts'
import {
  activeScenePath,
  addPlayerFacingImageViaApi,
  changePresentViaApi,
  closeTable,
  finishActiveSceneViaApi,
  HARVEY,
  LUCY,
  pageStatus,
  presentSection,
  referencePath,
  revealAnnouncement,
  revealButton,
  revealDialog,
  revealedInScene,
  revealedPath,
  revealedToSection,
  revealHandoutViaApi,
  setUpTable,
  startSceneViaApi,
  toRevealPath,
  type Table,
} from '../fixtures/scene-play'

/**
 * Traces to specs/scene-play/spec.md Scenarios (Reveal, targeting, snapshots, Clues) and to specs/scene-play/ux.md sections 11 to 20
 * (PBI-SPL-002):
 * - "Keeper reveals a Handout to one Investigator" (SPL-UX-21, 22, 26, 28), which also proves in the browser that an untargeted
 *   Player receives no data and no live signal (SPL-UX-28)
 * - "A Reveal defaults to every Investigator present" (SPL-UX-21)
 * - "A Keeper-facing Handout cannot be revealed" (SPL-UX-20)
 * - "A revealed Handout keeps its revealed content" (SPL-UX-30)
 * - "Revealing a Non-Player Entity shows only its Player-facing description" (SPL-UX-27)
 * - Map and Read-aloud presentation, and the image alt (SPL-UX-27)
 * - "An Investigator added later receives no earlier Reveals" (SPL-UX-29)
 * - Clues for the Player and the Keeper (SPL-UX-31 to 34)
 * - "Players cannot reveal" (SPL-UX-35)
 * Exceptions, covered by integration tests (RevealApiTests, ScenePlayAuthorizationMatrixTests): the Reveal 400s, the 409 race, and the
 * file 404 for non-recipients need requests the UI never sends.
 */

const FRONT_DOOR = PREPARED.handouts[0].title
const SECRET_DOOR = PREPARED.handouts[1].title
const PLAN = PREPARED.handouts[2].title
const CELLAR_MAP = 'Corbitt House cellar'
const CELLAR_MAP_DESCRIPTION = 'A plan of the cellar with the furnace in the north-east corner'
const CELLAR_PHOTO = 'Cellar stairs'
const CELLAR_PHOTO_DESCRIPTION = 'A photograph of the cellar stairs'

/** Each Reveal is a journey of its own with Keeper and Players in isolated contexts, which takes longer than the default. */
test.describe.configure({ timeout: 240_000 })

async function startCorbitt(page: Page, table: Table, present: string[]): Promise<void> {
  await startSceneViaApi(page.request, table.keeperBearer, table.prepared.campaignId, table.prepared.sceneId, present)
}

const handoutId = (table: Table, title: string): string => table.prepared.sceneHandoutIds[title]

/** Opens the reveal dialog of the item and returns it. */
async function openReveal(page: Page, title: string): Promise<Locator> {
  await revealButton(page, title).click()
  const dialog = revealDialog(page, title)
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Revealing to Investigators', () => {
  test('Keeper reveals a Handout to one Investigator, who sees it live, while the other receives nothing', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealOne')
    const { campaignId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    const lucyFrames = await recordHubFrames(table.lucy.page)
    const { secret } = table.prepared

    try {
      await table.harvey.page.goto(activeScenePath(campaignId))
      await table.lucy.page.goto(activeScenePath(campaignId))
      await expect(table.harvey.page.getByText(`The Keeper hasn't revealed anything to ${HARVEY} yet.`)).toBeVisible()
      await expect(table.lucy.page.getByText(`The Keeper hasn't revealed anything to ${LUCY} yet.`)).toBeVisible()
      await page.goto(toRevealPath(campaignId))

      await test.step('SPL-UX-21: "Reveal..." opens "Reveal The front door" with everyone present checked', async () => {
        const dialog = await openReveal(page, FRONT_DOOR)
        await expect(dialog.getByRole('group', { name: 'Reveal to' })).toBeVisible()
        await expect(dialog.getByRole('checkbox', { name: HARVEY })).toBeChecked()
        await expect(dialog.getByRole('checkbox', { name: LUCY })).toBeChecked()
        await expect(dialog.getByRole('checkbox', { name: HARVEY })).toBeFocused()
      })

      await test.step('SPL-UX-22: revealing to Harvey alone says so, marks the item, and returns focus to "Reveal..."', async () => {
        const dialog = revealDialog(page, FRONT_DOOR)
        await dialog.getByRole('checkbox', { name: LUCY }).uncheck()
        await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(pageStatus(page)).toHaveText(`${FRONT_DOOR} revealed to ${HARVEY}.`)
        const entry = page.getByRole('region', { name: 'Handouts' }).getByRole('listitem').filter({ hasText: FRONT_DOOR })
        await expect(entry).toContainText(`Revealed to ${HARVEY} . not yet: ${LUCY}`)
        await expect(revealButton(page, FRONT_DOOR)).toBeFocused()
      })

      await test.step('SPL-UX-43: with Lucy still missing it, the Revealed sub-tab stays empty', async () => {
        await page.goto(revealedPath(campaignId))
        await expect(revealedInScene(page).getByText('Nothing has been revealed in this Scene yet.')).toBeVisible()
        await page.goto(toRevealPath(campaignId))
      })

      await test.step('SPL-UX-26, SPL-UX-28: Harvey sees it without reloading, with its title and kind, and hears it announced', async () => {
        const section = revealedToSection(table.harvey.page, HARVEY)
        const article = section.getByRole('article')
        await expect(article.getByRole('heading', { level: 3, name: FRONT_DOOR })).toBeVisible()
        await expect(article).toContainText('Read-aloud')
        await expect(article).toContainText(`${FRONT_DOOR} ${secret}`)
        await expect(revealAnnouncement(table.harvey.page)).toHaveText(`New for ${HARVEY}: ${FRONT_DOOR}.`)
      })

      await test.step('SPL-UX-28: the Keeper then reveals a second Handout to everyone, and Lucy sees only that one', async () => {
        const dialog = await openReveal(page, PLAN)
        await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(pageStatus(page)).toHaveText(`${PLAN} revealed to ${HARVEY} and ${LUCY}. Moved to Revealed.`)
        await expect(page.getByRole('region', { name: 'Handouts' }).getByText(PLAN, { exact: true })).toHaveCount(0)
        await expect(page.getByRole('link', { name: 'To reveal, 3' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Revealed, 1' })).toBeVisible()
        const lucyArticles = revealedToSection(table.lucy.page, LUCY).getByRole('article')
        await expect(lucyArticles.getByRole('heading', { level: 3 })).toHaveText([PLAN])
        await expect(revealAnnouncement(table.lucy.page)).toHaveText(`New for ${LUCY}: ${PLAN}.`)
        await expect(revealedToSection(table.harvey.page, HARVEY).getByRole('article').getByRole('heading', { level: 3 })).toHaveText([PLAN, FRONT_DOOR])
        const lucyBody = await table.lucy.page.locator('body').innerText()
        expect(lucyBody, 'Lucy never saw the first Handout').not.toContain(FRONT_DOOR)
      })

      await test.step('SPL-UX-28: Lucy received exactly one myClues signal, for the second Reveal, and no activeScene signal', async () => {
        expect(lucyFrames.dataChangedTopics(), 'the live signals Lucy received').toEqual([['myClues']])
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Reveal defaults to every Investigator who has not received it yet', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealDefault')
    await startCorbitt(page, table, [table.harveyId, table.lucyId])

    try {
      await page.goto(toRevealPath(table.prepared.campaignId))

      await test.step('SPL-UX-21: after revealing to Harvey, the dialog marks him "(already revealed)" and checks only Lucy', async () => {
        const first = await openReveal(page, FRONT_DOOR)
        await first.getByRole('checkbox', { name: LUCY }).uncheck()
        await first.getByRole('button', { name: 'Reveal', exact: true }).click()
        await expect(first).toBeHidden()

        const second = await openReveal(page, FRONT_DOOR)
        await expect(second.getByRole('checkbox', { name: `${HARVEY} (already revealed)` })).not.toBeChecked()
        await expect(second.getByRole('checkbox', { name: LUCY })).toBeChecked()
      })

      await test.step('SPL-UX-23: with nothing checked the dialog refuses and reveals nothing; Cancel returns focus to "Reveal..."', async () => {
        const dialog = revealDialog(page, FRONT_DOOR)
        await dialog.getByRole('checkbox', { name: LUCY }).uncheck()
        await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
        await expect(dialog.getByText('Choose at least one Investigator.')).toBeVisible()
        await expect(dialog.getByRole('checkbox', { name: `${HARVEY} (already revealed)` })).toBeFocused()
        await dialog.getByRole('button', { name: 'Cancel' }).click()
        await expect(dialog).toBeHidden()
        await expect(revealButton(page, FRONT_DOOR)).toBeFocused()
        await page.goto(revealedPath(table.prepared.campaignId))
        await expect(revealedInScene(page).getByText('Nothing has been revealed in this Scene yet.')).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Keeper-facing Handout cannot be revealed', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealKeeperFacing')
    await startCorbitt(page, table, [table.harveyId])

    try {
      await test.step('SPL-UX-20: To reveal offers "Reveal..." on the Player-facing Handout but lists no Keeper-facing one', async () => {
        await page.goto(toRevealPath(table.prepared.campaignId))
        const handouts = page.getByRole('region', { name: 'Handouts', exact: true })
        await expect(handouts.getByRole('heading', { level: 4, name: SECRET_DOOR })).toHaveCount(0)
        await expect(revealButton(page, SECRET_DOOR)).toHaveCount(0)
        await expect(revealButton(page, FRONT_DOOR)).toBeVisible()
      })

      await test.step('SPL-UX-45: Keeper reference lists the Keeper-facing Handout with no "Reveal..."', async () => {
        await page.goto(referencePath(table.prepared.campaignId))
        const handouts = page.getByRole('region', { name: 'Handouts', exact: true })
        await expect(handouts.getByRole('heading', { level: 4, name: SECRET_DOOR })).toBeVisible()
        await expect(handouts.getByRole('listitem').filter({ hasText: SECRET_DOOR })).toContainText('Keeper-facing')
        await expect(revealButton(page, SECRET_DOOR)).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A revealed Handout keeps its revealed content when the Keeper changes it later', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealSnapshot')
    const { campaignId, secret } = table.prepared
    await startCorbitt(page, table, [table.harveyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, handoutId(table, FRONT_DOOR), [table.harveyId])

    try {
      await test.step('the Keeper changes the title and text of the revealed Handout through the API', async () => {
        const edited = await page.request.put(
          `${API_ORIGIN}/api/campaigns/${campaignId}/scenarios/${table.prepared.scenarioId}/scenes/${table.prepared.sceneId}/handouts/${handoutId(table, FRONT_DOOR)}`,
          {
            headers: { Authorization: table.keeperBearer },
            data: { kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'Changed title', content: textDocument(`Changed text ${secret}`) },
          },
        )
        expect(edited.status(), 'edit the Handout').toBe(200)
      })

      await test.step('SPL-UX-30: Harvey reloads and still sees the title and text as revealed, on the page and in the Clues panel', async () => {
        await table.harvey.page.goto(activeScenePath(campaignId))
        const article = revealedToSection(table.harvey.page, HARVEY).getByRole('article')
        await expect(article.getByRole('heading', { level: 3, name: FRONT_DOOR })).toBeVisible()
        await expect(article).toContainText(`${FRONT_DOOR} ${secret}`)
        expect(await table.harvey.page.locator('body').innerText()).not.toContain('Changed')

        await revealedToSection(table.harvey.page, HARVEY).getByRole('button', { name: `${HARVEY}'s Clues` }).click()
        const panel = table.harvey.page.getByRole('dialog', { name: `${HARVEY}'s Clues` })
        await expect(panel).toBeVisible()
        await expect(table.harvey.page).toHaveURL(/panel=clues/)
        await panel.getByRole('button', { name: `Show ${FRONT_DOOR}` }).click()
        await expect(panel.getByText(`${FRONT_DOOR} ${secret}`)).toBeVisible()
      })

      await test.step('the Keeper still sees the Reveal as it was made', async () => {
        await page.goto(revealedPath(campaignId))
        await expect(revealedInScene(page).getByRole('heading', { level: 3, name: FRONT_DOOR })).toBeVisible()
        await revealedInScene(page).getByRole('button', { name: `Show what was revealed: ${FRONT_DOOR}` }).click()
        const panel = page.getByRole('dialog', { name: FRONT_DOOR })
        await expect(panel).toBeVisible()
        await expect(panel.getByText(`${FRONT_DOOR} ${secret}`)).toBeVisible()
        await panel.getByRole('button', { name: 'Close' }).click()
        await expect(panel).toBeHidden()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Revealing a Non-Player Entity shows only its Player-facing description', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealEntity')
    const { campaignId, secret } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])

    try {
      await page.goto(toRevealPath(campaignId))

      await test.step('SPL-UX-22: the Keeper reveals "The landlord" to Harvey from the Non-Player Entities section', async () => {
        const dialog = await openReveal(page, PREPARED.humanNpcLinkName)
        await dialog.getByRole('checkbox', { name: LUCY }).uncheck()
        await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
        await expect(pageStatus(page)).toHaveText(`${PREPARED.humanNpcLinkName} revealed to ${HARVEY}.`)
      })

      await test.step('SPL-UX-27: Harvey sees the Player-facing name and description, and nothing of the profile', async () => {
        await table.harvey.page.goto(activeScenePath(campaignId))
        const article = revealedToSection(table.harvey.page, HARVEY).getByRole('article')
        await expect(article.getByRole('heading', { level: 3, name: PREPARED.humanNpcLinkName })).toBeVisible()
        await expect(article).toContainText('Non-Player Entity')
        await expect(article).toContainText(`Landlord ${secret}`)
        const body = await table.harvey.page.locator('body').innerText()
        expect(body, 'the profile name is not shown').not.toContain(PREPARED.humanNpcName)
        expect(body, 'the Keeper notes of the Scene are not shown').not.toContain('Scene notes')
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A revealed Map spans the full width, a Read-aloud sits in its panel, and an image alt is its description', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealPresentation')
    const { campaignId } = table.prepared
    const mapId = await addPlayerFacingImageViaApi(page.request, table.keeperBearer, table.prepared, { title: CELLAR_MAP, kind: 'Map', imageDescription: CELLAR_MAP_DESCRIPTION })
    const photoId = await addPlayerFacingImageViaApi(page.request, table.keeperBearer, table.prepared, { title: CELLAR_PHOTO, kind: 'Image', imageDescription: CELLAR_PHOTO_DESCRIPTION })
    await startCorbitt(page, table, [table.harveyId])
    for (const id of [mapId, photoId, handoutId(table, FRONT_DOOR), handoutId(table, PLAN)]) {
      await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, id, [table.harveyId])
    }

    try {
      await table.harvey.page.goto(activeScenePath(campaignId))
      const section = revealedToSection(table.harvey.page, HARVEY)

      await test.step('SPL-UX-27: the Map image carries its description as alt and spans wider than the reading column', async () => {
        const map = section.getByRole('article').filter({ hasText: CELLAR_MAP })
        const image = map.getByRole('img', { name: CELLAR_MAP_DESCRIPTION })
        await expect(image).toBeVisible()
        await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth), { message: 'the Map image loaded' }).toBeGreaterThan(0)
        const width = (await image.boundingBox())?.width ?? 0
        expect(width, 'a Map is wider than the 672px reading column').toBeGreaterThan(700)
      })

      await test.step('SPL-UX-27: an Image has its description as alt, and an Image without one has its title', async () => {
        await expect(section.getByRole('img', { name: CELLAR_PHOTO_DESCRIPTION })).toBeVisible()
        await expect(section.getByRole('img', { name: PLAN, exact: true })).toBeVisible()
      })

      await test.step('SPL-UX-27: the Read-aloud text sits in a panel without a heading of its own', async () => {
        const article = section.getByRole('article').filter({ has: table.harvey.page.getByRole('heading', { level: 3, name: FRONT_DOOR }) })
        await expect(article).toContainText('Read-aloud')
        await expect(article.getByRole('heading', { level: 2 })).toHaveCount(0)
        await expect(article.getByText(`${FRONT_DOOR} ${table.prepared.secret}`)).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('An Investigator added later receives no earlier Reveals, and a removed one keeps its Clues', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealLater')
    const { campaignId } = table.prepared
    await startCorbitt(page, table, [table.harveyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, handoutId(table, FRONT_DOOR), [table.harveyId])

    try {
      await test.step('SPL-UX-29: Lucy, added after the Reveal, sees nothing revealed and an empty Clues panel', async () => {
        await changePresentViaApi(page.request, table.keeperBearer, campaignId, [table.harveyId, table.lucyId])
        await table.lucy.page.goto(activeScenePath(campaignId))
        await expect(table.lucy.page.getByText(`The Keeper hasn't revealed anything to ${LUCY} yet.`)).toBeVisible()
        await revealedToSection(table.lucy.page, LUCY).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        const panel = table.lucy.page.getByRole('dialog', { name: `${LUCY}'s Clues` })
        await expect(panel).toBeVisible()
        await expect(panel.getByText(`${LUCY} hasn't received any Clues yet.`)).toBeVisible()
      })

      await test.step('SPL-UX-29: Harvey, removed from the Scene, sees that he is not taking part and keeps his Clues', async () => {
        await changePresentViaApi(page.request, table.keeperBearer, campaignId, [table.lucyId])
        await table.harvey.page.goto(activeScenePath(campaignId))
        await expect(table.harvey.page.getByText("This Scene is in progress. You aren't taking part in it.")).toBeVisible()
        expect(await table.harvey.page.locator('body').innerText()).not.toContain(FRONT_DOOR)
        await table.harvey.page.goto(`/campaigns/${campaignId}/investigator/clues`)
        await expect(table.harvey.page.getByRole('heading', { level: 3, name: FRONT_DOOR })).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Players cannot reveal and see no Keeper notes or Keeper-facing material', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'RevealForbidden')
    const { campaignId } = table.prepared
    await startCorbitt(page, table, [table.harveyId])
    const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${campaignId}`)

    try {
      await test.step('SPL-UX-35: the Player page has no "Reveal...", no Keeper notes, and no Keeper-facing Handout', async () => {
        await table.harvey.page.goto(activeScenePath(campaignId))
        await expect(table.harvey.page.getByRole('heading', { level: 1, name: PREPARED.firstSceneTitle })).toBeVisible()
        await expect(table.harvey.page.getByRole('button', { name: /^Reveal/ })).toHaveCount(0)
        await expect(table.harvey.page.getByRole('button', { name: 'Show Keeper notes' })).toHaveCount(0)
        const body = await table.harvey.page.locator('body').innerText()
        expect(body, 'no Keeper-facing Handout is listed').not.toContain(SECRET_DOOR)
        expect(body, 'no Keeper notes are shown').not.toContain('Scene notes')
      })

      await test.step('SPL-UX-35: a Player revealing through the API is answered 404 and nothing is revealed', async () => {
        const response = await page.request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/active-scene/reveals`, {
          headers: { Authorization: harveyBearer },
          data: { subject: { type: 'Handout', id: handoutId(table, FRONT_DOOR) }, investigatorIds: [table.harveyId] },
        })
        expect(response.status(), 'a Player reveal').toBe(404)
        await page.goto(revealedPath(campaignId))
        await expect(revealedInScene(page).getByText('Nothing has been revealed in this Scene yet.')).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })
})

test.describe('Clues', () => {
  test('A Player reads their Clues grouped by Scene, and the Keeper reads any Investigator\'s', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Clues')
    const { campaignId } = table.prepared
    await startCorbitt(page, table, [table.harveyId, table.lucyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, handoutId(table, FRONT_DOOR), [table.harveyId, table.lucyId])
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, handoutId(table, PLAN), [table.harveyId])
    await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)
    await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.meetingKnottId, [table.harveyId])
    const letter = await page.request.post(
      `${API_ORIGIN}/api/campaigns/${campaignId}/scenarios/${table.prepared.scenarioId}/scenes/${table.meetingKnottId}/handouts`,
      {
        headers: { Authorization: table.keeperBearer },
        data: { kind: 'Text', visibility: 'PlayerFacing', title: 'A letter from Knott', content: textDocument('Come at once.') },
      },
    )
    expect(letter.status(), 'add the letter').toBe(201)
    await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, ((await letter.json()) as { id: string }).id, [table.harveyId])
    const harveyPage = table.harvey.page

    try {
      await test.step('SPL-UX-31: Harvey opens his Clues from the Overview, grouped by Scene with the newest Scene first', async () => {
        await harveyPage.goto(`/campaigns/${campaignId}/investigator/clues`)
        await expect(harveyPage.getByRole('heading', { level: 1, name: `${HARVEY}'s Clues` })).toBeVisible()
        await expect(harveyPage.getByText(`Everything ${HARVEY} received from the Keeper, newest first.`)).toBeVisible()
        await expect(harveyPage.getByRole('heading', { level: 2 })).toHaveText([PREPARED.secondSceneTitle, PREPARED.firstSceneTitle])
        const corbitt = harveyPage.getByRole('region', { name: PREPARED.firstSceneTitle, exact: true })
        await expect(corbitt.getByRole('heading', { level: 3 })).toHaveText([PLAN, FRONT_DOOR])
      })

      await test.step('SPL-UX-31: "Show" opens a Clue and "Hide" closes it again', async () => {
        const show = harveyPage.getByRole('button', { name: `Show ${FRONT_DOOR}`, exact: true })
        await expect(show).toHaveAttribute('aria-expanded', 'false')
        await show.click()
        await expect(harveyPage.getByText(`${FRONT_DOOR} ${table.prepared.secret}`)).toBeVisible()
        await harveyPage.getByRole('button', { name: `Hide ${FRONT_DOOR}`, exact: true }).click()
        await expect(harveyPage.getByText(`${FRONT_DOOR} ${table.prepared.secret}`)).toHaveCount(0)
      })

      await test.step('SPL-UX-33: the Keeper reads Lucy\'s Clues in a panel from "Investigators present", then opens the full page', async () => {
        await changePresentViaApi(page.request, table.keeperBearer, campaignId, [table.harveyId, table.lucyId])
        await page.goto(activeScenePath(campaignId))
        await presentSection(page).getByRole('button', { name: `${LUCY}'s Clues` }).click()
        const panel = page.getByRole('dialog', { name: `${LUCY}'s Clues` })
        await expect(panel).toBeVisible()
        await expect(page).toHaveURL(/panel=clues&investigator=/)
        await expect(panel.getByRole('heading', { level: 4, name: FRONT_DOOR })).toBeVisible()
        await panel.getByRole('link', { name: 'Open full page' }).click()
        await expect(page.getByRole('heading', { level: 1, name: `${LUCY}'s Clues` })).toBeVisible()
        await expect(page.getByRole('link', { name: `Back to ${PREPARED.secondSceneTitle}` })).toBeVisible()
      })

      await test.step('SPL-UX-34: a Player opening a Keeper Clues URL is told the Investigator was not found', async () => {
        await harveyPage.goto(`/campaigns/${campaignId}/investigators/${table.lucyId}/clues`)
        await expect(harveyPage.getByRole('heading', { level: 1, name: "We couldn't find that Investigator" })).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Player without an Approved Investigator is told there are no Clues to show', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'CluesNone')
    const newcomer = await joinAsNewPlayer(browser, table.inviteToken, 'Newcomer')

    try {
      await newcomer.page.goto(`/campaigns/${table.prepared.campaignId}/investigator/clues`)

      await test.step('SPL-UX-32: the page says there is no Approved Investigator yet and offers the way back', async () => {
        await expect(newcomer.page.getByRole('heading', { level: 1, name: 'No Clues to show' })).toBeVisible()
        await expect(newcomer.page.getByText("You don't have an Approved Investigator in this Campaign yet.")).toBeVisible()
        await expect(newcomer.page.getByRole('link', { name: 'Back to your Campaign' })).toBeVisible()
      })
    } finally {
      await newcomer.context.close()
      await closeTable(table)
    }
  })
})
