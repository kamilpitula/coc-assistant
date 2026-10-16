import { randomUUID } from 'node:crypto'

import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { attentionList, atTheTable, campaignNav } from '../fixtures/overview'
import {
  createScenarioViaUi,
  scenarioLinks,
  scenarioNotesField,
  scenariosApiUrl,
  scenariosSection,
  scenarioTitleField,
  submitScenarioForm,
} from '../fixtures/scenarios'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Keeper creates a Scenario", "New Scenarios follow the
 * existing ones", "Keeper edits a Scenario", "Keeper reorders the Scenarios", and "Scenarios are the Keeper's alone",
 * and to specs/scenario-preparation/ux.md SP-UX-1 to SP-UX-12. SP-UX-13 (a failed or stale move) and SP-UX-14 (a
 * single Scenario has no move controls) are covered by component tests only: forcing a server failure or a second
 * window in E2E adds flake without more contract coverage.
 */
test.describe('Scenario Preparation', () => {
  test('Keeper creates two Scenarios in order, reorders them, and edits one', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Scenarios ${keeper.oid.slice(0, 6)}`)
    const noScenarioItem = attentionList(page).getByText('This Campaign has no Scenario yet.')

    await test.step('SP-UX-1, SP-UX-2: a Campaign with no Scenario says so in the section and in "Needs your attention"', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(scenariosSection(page).getByRole('heading', { level: 2, name: 'Scenarios' })).toBeVisible()
      await expect(scenariosSection(page).getByText('No Scenarios yet.')).toBeVisible()
      await expect(noScenarioItem).toBeVisible()
    })

    await test.step('SP-UX-5: submitting an empty title explains it, focuses Title, and saves nothing', async () => {
      await attentionList(page).getByRole('link', { name: 'Create Scenario' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Create Scenario' })).toBeVisible()
      await page.getByRole('button', { name: 'Create Scenario' }).click()
      await expect(page.getByText('Enter a title.')).toBeVisible()
      await expect(scenarioTitleField(page)).toBeFocused()
      await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/scenarios/new$`))
    })

    await test.step('SP-UX-3, SP-UX-8: a valid title opens the new Scenario with "Scenario created." under the Overview tab', async () => {
      await submitScenarioForm(page, 'The Haunting', 'The cellar key is under the stairs.')
      await expect(page.getByRole('status').filter({ hasText: 'Scenario created.' })).toBeVisible()
      await expect(page.getByText('The cellar key is under the stairs.')).toBeVisible()
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })

    await test.step('SP-UX-2: once a Scenario exists the attention item is gone', async () => {
      await campaignNav(page).getByRole('link', { name: 'Overview', exact: true }).click()
      await expect(atTheTable(page)).toBeVisible()
      await expect(scenarioLinks(page)).toHaveText(['The Haunting'])
      await expect(noScenarioItem).toHaveCount(0)
    })

    await test.step('SP-UX-4: a second Scenario created from the section is listed after the first', async () => {
      await scenariosSection(page).getByRole('link', { name: 'Create Scenario' }).click()
      await submitScenarioForm(page, 'Edge of Darkness')
      await campaignNav(page).getByRole('link', { name: 'Overview', exact: true }).click()
      await expect(scenarioLinks(page)).toHaveText(['The Haunting', 'Edge of Darkness'])
    })

    await test.step('SP-UX-11, SP-UX-12: moving "Edge of Darkness" up reorders the list, announces it, and keeps focus', async () => {
      await scenariosSection(page).getByRole('button', { name: 'Move Edge of Darkness up' }).click()
      await expect(scenarioLinks(page)).toHaveText(['Edge of Darkness', 'The Haunting'])
      await expect(scenariosSection(page).getByRole('status')).toHaveText('Edge of Darkness moved to position 1 of 2.')
      await expect(scenariosSection(page).getByRole('button', { name: 'Move Edge of Darkness down' })).toBeFocused()
    })

    await test.step('SP-UX-11: the new order survives a reload', async () => {
      await page.reload()
      await expect(scenarioLinks(page)).toHaveText(['Edge of Darkness', 'The Haunting'])
    })

    await test.step('SP-UX-6: editing the title and notes shows "Scenario saved." and the change persists', async () => {
      await scenarioLinks(page).filter({ hasText: 'The Haunting' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'The Haunting' })).toBeVisible()
      await page.getByRole('button', { name: 'Edit' }).click()
      await expect(scenarioTitleField(page)).toBeFocused()
      await scenarioTitleField(page).fill('The Haunting, revised')
      await scenarioNotesField(page).fill('The key was in the cellar all along.')
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Scenario saved.' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit' })).toBeFocused()
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'The Haunting, revised' })).toBeVisible()
      await expect(page.getByText('The key was in the cellar all along.')).toBeVisible()
    })

    await test.step('SP-UX-8: the Scenario page keeps Overview as the current tab', async () => {
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })
  })

  test('A Player and another Campaign\'s Keeper cannot see or change a Campaign\'s Scenarios', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Private ${keeper.oid.slice(0, 6)}`)
    const otherCampaignId = await createCampaignViaUi(page, `Other ${keeper.oid.slice(0, 6)}`)
    const scenarioId = await createScenarioViaUi(page, campaignId, 'Secret plot', 'Secret notes.')
    const otherScenarioId = await createScenarioViaUi(page, otherCampaignId, 'Other plot')
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))

    try {
      const scenarioRequests: string[] = []
      player.page.on('request', (request) => {
        const { pathname } = new URL(request.url())
        if (pathname.startsWith('/api/') && pathname.includes('/scenarios')) {
          scenarioRequests.push(request.url())
        }
      })

      await test.step('SP-UX-9: the Player\'s Overview has no Scenarios section and no Scenario attention item', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(atTheTable(player.page)).toBeVisible()
        await expect(scenariosSection(player.page)).toHaveCount(0)
        await expect(player.page.getByText('This Campaign has no Scenario yet.')).toHaveCount(0)
        await expect(player.page.getByText('Secret plot')).toHaveCount(0)
      })

      await test.step('SP-UX-9: a Scenario URL and the create URL show "We couldn\'t find that Scenario" to the Player', async () => {
        for (const path of [`/scenarios/${scenarioId}`, '/scenarios/new']) {
          await player.page.goto(`/campaigns/${campaignId}${path}`)
          await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeVisible()
        }
        await expect(player.page.getByText('Secret plot')).toHaveCount(0)
        expect(scenarioRequests, 'a Player\'s client never asks for Scenarios').toEqual([])
      })

      await test.step('the Player\'s bearer gets 404 for list, get, create, edit, and reorder', async () => {
        const bearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
        await expectAllNotFound(player.page, bearer, campaignId, scenarioId)
      })

      await test.step('another Keeper\'s bearer gets 404 for the same calls, and the UI shows not found', async () => {
        const bearer = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        await expectAllNotFound(otherKeeper.page, bearer, campaignId, scenarioId)
        await otherKeeper.page.goto(`/campaigns/${campaignId}/scenarios/${scenarioId}`)
        await expect(otherKeeper.page.getByRole('heading', { name: "We couldn't find that Campaign" })).toBeVisible()
        await expect(otherKeeper.page.getByText('Secret plot')).toHaveCount(0)
      })

      await test.step('SP-UX-10: a Scenario id from the Keeper\'s other Campaign shows not found under this Campaign', async () => {
        await page.goto(`/campaigns/${campaignId}/scenarios/${otherScenarioId}`)
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeVisible()
        await expect(page.getByText('Other plot')).toHaveCount(0)
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })
})

/** Calls every Scenario endpoint of the Campaign with this bearer and expects 404 from each. */
async function expectAllNotFound(
  page: Page,
  bearer: string,
  campaignId: string,
  scenarioId: string,
): Promise<void> {
  const headers = { Authorization: bearer }
  const body = { title: 'Mine', keeperNotes: 'x' }
  const responses = {
    list: await page.request.get(scenariosApiUrl(API_ORIGIN, campaignId), { headers }),
    get: await page.request.get(scenariosApiUrl(API_ORIGIN, campaignId, `/${scenarioId}`), { headers }),
    create: await page.request.post(scenariosApiUrl(API_ORIGIN, campaignId), { headers, data: body }),
    edit: await page.request.put(scenariosApiUrl(API_ORIGIN, campaignId, `/${scenarioId}`), { headers, data: body }),
    reorder: await page.request.put(scenariosApiUrl(API_ORIGIN, campaignId, '/order'), {
      headers,
      data: { scenarioIds: [scenarioId, randomUUID()] },
    }),
  }
  const statuses = Object.fromEntries(Object.entries(responses).map(([name, response]) => [name, response.status()]))
  expect(statuses, 'every Scenario endpoint answers 404 to a non-Keeper').toEqual({
    list: 404,
    get: 404,
    create: 404,
    edit: 404,
    reorder: 404,
  })
}
