import { test, expect } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { recordHubFrames } from '../fixtures/hub'
import { joinAsNewPlayer } from '../fixtures/investigators'
import { createScenarioViaUi } from '../fixtures/scenarios'
import { createSceneViaUi, sceneLinks, scenesSection, sceneTitleField } from '../fixtures/scenes'

/**
 * Traces to specs/scene-play/spec.md, Live updates (`scenes`) and the Gherkin scenario "Scene changes reach the
 * Keeper's other tabs live", and to specs/scene-play/ux.md section 21.10 (a `scenes` refetch is silent: nothing is
 * announced to the Keeper).
 */
test.describe('Scene live updates', () => {
  test('A Scene rename reaches the Keeper other tab live, without reloading and without an announcement, and no Player hears it', async ({
    page,
    browser,
  }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignName = `Scene Live ${keeper.oid.slice(0, 6)}`
    const campaignId = await createCampaignViaUi(page, campaignName)
    const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
    const scenarioUrl = `/campaigns/${campaignId}/scenarios/${scenarioId}`
    const sceneId = await createSceneViaUi(page, campaignId, scenarioId, 'The Corbitt House')
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerHub = await recordHubFrames(player.page)

    const tabB = await page.context().newPage()

    try {
      await test.step('the Player has the Campaign open and the Keeper has the Scenario open in two tabs', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(player.page.getByRole('heading', { level: 1, name: campaignName })).toBeVisible()
        await tabB.goto(scenarioUrl)
        await expect(sceneLinks(tabB)).toHaveText(['The Corbitt House'])
        await tabB.evaluate(() => {
          ;(window as unknown as { __sceneLiveMarker?: boolean }).__sceneLiveMarker = true
        })
      })

      await test.step('the Keeper renames the Scene in the first tab', async () => {
        await page.goto(`${scenarioUrl}/scenes/${sceneId}`)
        await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
        await page.getByRole('button', { name: 'Edit' }).click()
        await sceneTitleField(page).fill('The Corbitt Cellar')
        await page.getByRole('button', { name: 'Save' }).click()
        await expect(page.getByRole('status').filter({ hasText: 'Scene saved.' })).toBeVisible()
        await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt Cellar' })).toBeVisible()
      })

      await test.step('the other tab shows the new title without reloading and announces nothing', async () => {
        await expect(sceneLinks(tabB)).toHaveText(['The Corbitt Cellar'])
        expect(await tabB.evaluate(() => (window as unknown as { __sceneLiveMarker?: boolean }).__sceneLiveMarker)).toBe(
          true,
        )
        await expect(scenesSection(tabB).getByRole('status')).toHaveText('')
      })

      await test.step('no Player receives a live signal about it', async () => {
        expect(playerHub.dataChangedTopics(), 'the live signals the Player received').toEqual([])
      })
    } finally {
      await tabB.close()
      await player.context.close()
    }
  })
})
