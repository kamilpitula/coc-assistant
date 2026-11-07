import { test, expect, type Page } from '@playwright/test'

import { campaignNav } from '../fixtures/overview'
import { PREPARED } from '../fixtures/prepared-scenario'
import {
  addPlayerFacingImageViaApi,
  closeTable,
  finishActiveSceneViaApi,
  HARVEY,
  LUCY,
  revealHandoutViaApi,
  sceneHistoryPath,
  setUpTable,
  startSceneViaApi,
  type Table,
} from '../fixtures/scene-play'

/**
 * Traces to specs/scene-play/spec.md Scenario "Players see the Scene History filtered to their Clues" (spec.md 192-196)
 * and to specs/scene-play/ux.md section 23 (PBI-SPL-004):
 * - "A Player sees the Scene History filtered to their Clues, with the tab current" (SPL-UX-61, SPL-UX-62, SPL-UX-64, SPL-UX-66;
 *   the plan reaches Lucy only, so its absence for Harvey is the revealed-elsewhere half of spec.md 198-201)
 * - "The Keeper sees every Reveal with its recipients and who was present" (SPL-UX-63)
 * - "Finishing, revealing, and starting update a connected Player without reloading" (SPL-UX-68, SPL-UX-64)
 * Exceptions, covered by integration tests (SceneHistoryApiTests, ScenePlayAuthorizationMatrixTests): a Player-facing Handout
 * never revealed to anyone stays Keeper-only (spec.md 198-201), cross-Campaign 404, unauthenticated 401, unplayed-Scenario
 * title secrecy, and the finish-then-start tie order.
 */

const FRONT_DOOR = PREPARED.handouts[0].title // Read-aloud, Player-facing
const PLAN = PREPARED.handouts[2].title // Image, Player-facing
const KNOTT = PREPARED.secondSceneTitle // "Meeting Knott": no handouts, stays Prepared until the live journey
const MAP_TITLE = 'Cellar stairs map'

/** The Scene History tab, asserted current on the page (SPL-UX-61). */
async function expectHistoryCurrent(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Scene History' })).toBeVisible()
  await expect(campaignNav(page).getByRole('link', { name: 'Scene History', exact: true })).toHaveAttribute('aria-current', 'page')
}

/** Starts "The Corbitt House" with Harvey and Lucy present; Harvey holds two Reveals, Lucy one. */
async function playCorbitt(page: Page, table: Table): Promise<void> {
  const { campaignId } = table.prepared
  await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
  await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneHandoutIds[FRONT_DOOR], [table.harveyId])
  await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneHandoutIds[PLAN], [table.lucyId])
  // A Player-facing Map, so "Show" renders a file-endpoint image (SPL-UX-66).
  const mapId = await addPlayerFacingImageViaApi(page.request, table.keeperBearer, table.prepared, {
    title: MAP_TITLE,
    kind: 'Map',
    imageDescription: 'A plan of the cellar',
  })
  await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, mapId, [table.harveyId])
}

// Each journey signs in a Keeper and joins Players in isolated contexts before it checks anything, which takes longer than the default.
test.describe.configure({ timeout: 240_000 })

test.describe('Scene History', () => {
  test('A Player sees the Scene History filtered to their Clues, with the tab current', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'HistoryPlayer')
    const { campaignId } = table.prepared

    try {
      await playCorbitt(page, table)
      await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)

      await test.step('SPL-UX-61: "Scene History" is current on the page for the Keeper and the Player', async () => {
        await page.goto(sceneHistoryPath(campaignId))
        await expectHistoryCurrent(page)
        await table.harvey.page.goto(sceneHistoryPath(campaignId))
        await expectHistoryCurrent(table.harvey.page)
      })

      await test.step('SPL-UX-62: Harvey sees "The Corbitt House" with its Scenario, start, and finish', async () => {
        const scene = table.harvey.page.getByRole('region', { name: 'The Corbitt House' })
        await expect(scene).toBeVisible()
        await expect(scene).toContainText(`Scenario: ${PREPARED.scenarioTitle}`)
        // Dates follow the scenes.spec.ts precedent: labels, not exact instants (exact times are unit-covered).
        await expect(scene.getByText('Started')).toBeVisible()
        await expect(scene.getByText('Finished')).toBeVisible()
      })

      await test.step('spec 192-196, SPL-UX-64: only what reached Harvey is listed, with no recipients or present list', async () => {
        const scene = table.harvey.page.getByRole('region', { name: 'The Corbitt House' })
        await expect(scene.getByRole('heading', { level: 3, name: FRONT_DOOR })).toBeVisible()
        await expect(scene.getByRole('heading', { level: 3, name: MAP_TITLE })).toBeVisible()
        // The plan reached Lucy only: absent for Harvey (spec 198-201), as are the Keeper-only lines.
        await expect(scene.getByRole('heading', { level: 3, name: PLAN })).toHaveCount(0)
        await expect(scene).not.toContainText('Investigators present')
        await expect(scene).not.toContainText(`to ${HARVEY}`)
      })

      await test.step('SPL-UX-66: "Show" renders the revealed Map image from the file endpoint', async () => {
        const scene = table.harvey.page.getByRole('region', { name: 'The Corbitt House' })
        await scene.getByRole('button', { name: `Show ${MAP_TITLE}` }).click()
        // The Map renders its image description as the img accessible name.
        await expect(scene.getByRole('img', { name: 'A plan of the cellar' })).toBeVisible()
      })

      await test.step('SPL-UX-62: the never-started "Meeting Knott" is not listed', async () => {
        await expect(table.harvey.page.getByRole('heading', { level: 2, name: KNOTT })).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('The Keeper sees every Reveal with its recipients and who was present', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'HistoryKeeper')
    const { campaignId } = table.prepared

    try {
      await playCorbitt(page, table)
      await page.goto(sceneHistoryPath(campaignId))

      await test.step('SPL-UX-63: the Scene names who was present and every Reveal with "to {names}"', async () => {
        const scene = page.getByRole('region', { name: 'The Corbitt House' })
        await expect(scene).toBeVisible()
        await expect(scene).toContainText(`Investigators present: ${HARVEY} and ${LUCY}`)
        await expect(scene.getByRole('heading', { level: 3, name: FRONT_DOOR })).toBeVisible()
        await expect(scene.getByRole('heading', { level: 3, name: PLAN })).toBeVisible()
        await expect(scene.getByRole('heading', { level: 3, name: MAP_TITLE })).toBeVisible()
        await expect(scene).toContainText(`to ${HARVEY}`)
        await expect(scene).toContainText(`to ${LUCY}`)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Finishing, revealing, and starting update a connected Player without reloading', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'HistoryLive')
    const { campaignId } = table.prepared

    try {
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await table.harvey.page.goto(sceneHistoryPath(campaignId))
      const scene = table.harvey.page.getByRole('region', { name: 'The Corbitt House' })
      await expect(scene).toBeVisible()

      await test.step('SPL-UX-68: a Reveal to Lucy only never appears on Harvey\'s page', async () => {
        // While "The Corbitt House" is still Active, so the Reveal has an Active Scene to land in.
        await revealHandoutViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneHandoutIds[PLAN], [table.lucyId])
        // Positive signal the Reveal landed: Lucy sees the plan on her history.
        await table.lucy.page.goto(sceneHistoryPath(campaignId))
        await expect(table.lucy.page.getByRole('heading', { level: 3, name: PLAN })).toBeVisible()
        // Finishing refetches Harvey's page (sceneHistory), so its continued absence proves filtering, not staleness.
        await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)
        await expect(scene).toContainText('Finished')
        await expect(scene.getByRole('heading', { level: 3, name: PLAN })).toHaveCount(0)
      })

      await test.step('SPL-UX-68, SPL-UX-64: the finished "Meeting Knott" appears on top with its empty sentence', async () => {
        await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.meetingKnottId, [table.harveyId], true)
        await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)
        const knott = table.harvey.page.getByRole('region', { name: KNOTT })
        await expect(knott).toBeVisible()
        await expect(knott).toContainText(`Nothing from this Scene reached ${HARVEY}.`)
        // Newest started first: Knott above Corbitt.
        const headings = await table.harvey.page.getByRole('heading', { level: 2 }).allTextContents()
        expect(headings).toEqual([KNOTT, 'The Corbitt House'])
      })
    } finally {
      await closeTable(table)
    }
  })
})
