import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { itemsSection, sceneItemNames } from '../fixtures/items'
import { nonPlayerEntitiesSection } from '../fixtures/non-player-entities'
import { PREPARED, prepareScenarioViaApi, type PreparedScenario } from '../fixtures/prepared-scenario'
import { handoutLinks, handoutSection } from '../fixtures/scene-handouts'
import { linkHeadings, linkSection } from '../fixtures/scene-links'
import { scenariosSection } from '../fixtures/scenarios'
import { sceneLinks, scenesSection } from '../fixtures/scenes'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Manual preparation works without extraction" (SP-UX-15, SP-UX-50,
 * SP-UX-64, SP-UX-67, SP-UX-97) and "Prepared material stays hidden from Players" (SP-UX-9, SP-UX-26, SP-UX-28, SP-UX-39,
 * SP-UX-74, SP-UX-90, SP-UX-102), and to ux.md SP-UX-21, SP-UX-81, SP-UX-83, SP-UX-96 (PBI-SP-006 D1).
 *
 * "Without extraction": this E2E API is configured with a database and a Handout file directory only. It has no LLM and no
 * source document upload, and the test uploads no source document (design record D2). The data is created through the API
 * before the UI is checked (e2e/CLAUDE.md section 2); each preparation step has its own UI test in the per-feature specs.
 *
 * Exceptions: the "no live update" clause cannot be observed from the UI; it is covered by the CampaignHubTests integration test.
 * Active and Finished Scenes cannot be reached before PBI-SPL-001, so only Prepared Scenes are checked here.
 */

async function prepare(page: Page, label: string): Promise<PreparedScenario> {
  const keeper = newAccount('Keeper')
  await signIn(page, keeper)
  const campaignId = await createCampaignViaUi(page, `${label} ${keeper.oid.slice(0, 6)}`)
  const bearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}`)
  return prepareScenarioViaApi(page.request, bearer, campaignId, `secret-${keeper.oid.slice(0, 8)}`)
}

test.describe('Manual Scenario preparation', () => {
  test('Keeper opens a Scenario prepared by hand, without a source document, and finds every part in place', async ({ page }) => {
    const prepared = await prepare(page, 'By hand')

    await test.step('SP-UX-15, SP-UX-21: the Scenario page lists the reordered Scenes with their status', async () => {
      await page.goto(prepared.scenarioPath)
      await expect(page.getByRole('heading', { level: 1, name: PREPARED.scenarioTitle })).toBeVisible()
      await expect(sceneLinks(page)).toHaveText([PREPARED.secondSceneTitle, PREPARED.firstSceneTitle])
      await expect(scenesSection(page).getByText('Prepared', { exact: true })).toHaveCount(2)
    })

    await test.step('SP-UX-50: the Scene page lists both Non-Player Entity links with the profile they point to', async () => {
      await sceneLinks(page).filter({ hasText: PREPARED.firstSceneTitle }).click()
      await expect(page.getByRole('heading', { level: 1, name: PREPARED.firstSceneTitle })).toBeVisible()
      await expect(linkHeadings(page)).toHaveText([PREPARED.humanNpcLinkName, PREPARED.creatureLinkName])
      await expect(linkSection(page).getByRole('link', { name: PREPARED.humanNpcName })).toBeVisible()
      await expect(linkSection(page).getByRole('link', { name: PREPARED.creatureName })).toBeVisible()
      await expect(linkSection(page).getByText('No Player-facing description yet.')).toBeVisible()
    })

    await test.step('SP-UX-64, SP-UX-67: the Handouts are listed in stored order with their kind and visibility as text', async () => {
      await expect(handoutLinks(page)).toHaveText(PREPARED.handouts.map((handout) => handout.title))
      for (const handout of PREPARED.handouts) {
        const row = handoutSection(page).getByRole('listitem').filter({ hasText: handout.title })
        await expect(row).toContainText(handout.kindText)
        await expect(row).toContainText(handout.visibilityText)
      }
    })

    await test.step('SP-UX-97: the Scene page lists the linked Item', async () => {
      await expect(sceneItemNames(page)).toHaveText([PREPARED.itemName])
    })

    await test.step('SP-UX-81: the Keeper-facing Map shows its image with name and size', async () => {
      await handoutLinks(page).filter({ hasText: 'Arkham map' }).click()
      await expect(page.getByRole('heading', { level: 2, name: 'Map' })).toBeVisible()
      await expect(page.getByRole('img', { name: 'Arkham map' })).toBeVisible()
      await expect(page.getByText(`${PREPARED.mapFileName}, 1 KB`)).toBeVisible()
    })

    await test.step('SP-UX-83: the Keeper-facing Document shows its name and size without a preview', async () => {
      await page.goto(`${prepared.scenePath}/handouts/${prepared.sceneHandoutIds['Diary pages']}`)
      await expect(page.getByRole('heading', { level: 2, name: 'Document' })).toBeVisible()
      await expect(page.getByText(PREPARED.documentFileName, { exact: true })).toBeVisible()
      await expect(page.getByText('PDF, 2 KB')).toBeVisible()
    })

    await test.step('SP-UX-96: the Item page lists its Handouts and the Scene that links it', async () => {
      await page.goto(`/campaigns/${prepared.campaignId}/items/${prepared.itemId}`)
      await expect(page.getByRole('heading', { level: 1, name: PREPARED.itemName })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Handouts' }).getByRole('listitem').getByRole('link')).toHaveText([...PREPARED.itemHandouts])
      const scenes = page.getByRole('region', { name: 'Scenes' })
      await expect(scenes.getByRole('link', { name: PREPARED.firstSceneTitle })).toBeVisible()
      await expect(scenes).toContainText(`Scenario: ${PREPARED.scenarioTitle}`)
      await expect(scenes).toContainText('Prepared')
    })
  })

  test('A Player of the Campaign finds none of the prepared Scenario', async ({ page, browser }) => {
    const prepared = await prepare(page, 'Hidden')
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, prepared.campaignId))
    const handoutId = prepared.sceneHandoutIds['The front door']

    async function expectNoPreparedText(): Promise<void> {
      const body = await player.page.locator('body').innerText()
      expect(body, `page ${player.page.url()} must show no prepared text`).not.toContain(prepared.secret)
      for (const text of [PREPARED.itemName, PREPARED.humanNpcName, PREPARED.firstSceneTitle, PREPARED.scenarioTitle, PREPARED.handouts[0].title]) {
        expect(body, `page ${player.page.url()} must not show "${text}"`).not.toContain(text)
      }
    }

    try {
      await test.step("SP-UX-9, SP-UX-28, SP-UX-90: the Player's Overview has no Scenarios, Non-Player Entities, or Items section", async () => {
        await player.page.goto(`/campaigns/${prepared.campaignId}`)
        await expect(player.page.getByRole('region', { name: 'At the table' })).toBeVisible()
        await expect(scenariosSection(player.page)).toHaveCount(0)
        await expect(nonPlayerEntitiesSection(player.page)).toHaveCount(0)
        await expect(itemsSection(player.page)).toHaveCount(0)
        await expectNoPreparedText()
      })

      const notFound: Array<{ step: string; path: string; heading: string }> = [
        { step: 'SP-UX-9: the Scenario URL', path: prepared.scenarioPath, heading: "We couldn't find that Scenario" },
        { step: 'SP-UX-26: the Scene URL', path: prepared.scenePath, heading: "We couldn't find that Scene" },
        { step: 'SP-UX-74: the Handout URL', path: `${prepared.scenePath}/handouts/${handoutId}`, heading: "We couldn't find that Scene" },
        { step: 'SP-UX-102: the Item URL', path: `/campaigns/${prepared.campaignId}/items/${prepared.itemId}`, heading: "We couldn't find that Item" },
        { step: 'SP-UX-39: the Human NPC profile URL', path: prepared.humanNpcPath, heading: "We couldn't find that Non-Player Entity" },
      ]
      for (const target of notFound) {
        await test.step(`${target.step} shows "${target.heading}" and no prepared text`, async () => {
          await player.page.goto(target.path)
          await expect(player.page.getByRole('heading', { level: 1, name: target.heading })).toBeVisible()
          await expectNoPreparedText()
        })
      }
    } finally {
      await player.context.close()
    }
  })
})
