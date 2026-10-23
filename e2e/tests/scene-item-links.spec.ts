import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import {
  createItemViaUi,
  itemLinksApiUrl,
  itemPicker,
  linkItemViaUi,
  openLinkItemPage,
  sceneItemNames,
  sceneItemSection,
} from '../fixtures/items'
import { createScenarioViaUi } from '../fixtures/scenarios'
import { createSceneViaUi } from '../fixtures/scenes'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Keeper prepares an Item" (the linking part: the Scene lists the Item
 * and the Item lists the Scene), "Deleting an Item linked only to Prepared Scenes removes its links" (the Scene page part is in
 * items.spec.ts), and "Campaign boundaries isolate Scenario material" (the Item picker part), and to
 * specs/scenario-preparation/ux.md SP-UX-51 (extended by SP-UX-102), SP-UX-96 to SP-UX-99, SP-A11Y-52, SP-A11Y-54, and
 * SP-A11Y-55.
 *
 * Exceptions: Active and Finished Scenes cannot be seeded end to end until PBI-SPL-001 (ux.md section 70), so the Finished part
 * of SP-UX-97 to SP-UX-99 ("Link an Item" and "Unlink" hidden, the Finished page and the 409 messages) is covered by the seeded
 * integration tests (ItemLinkApiTests) and by component tests. The double activation of a button is covered by component tests,
 * where an end-to-end run would only repeat it slowly.
 */

interface SceneSetup {
  campaignId: string
  scenarioId: string
  sceneId: string
  scenePath: string
}

async function openScene(page: Page, scene: SceneSetup): Promise<void> {
  await page.goto(scene.scenePath)
  await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
}

/** Creates a Campaign, a Scenario, and a Prepared Scene "The Corbitt House" as a new Keeper. */
async function prepareScene(page: Page, label: string): Promise<SceneSetup> {
  const keeper = newAccount('Keeper')
  await signIn(page, keeper)
  const campaignId = await createCampaignViaUi(page, `${label} ${keeper.oid.slice(0, 6)}`)
  const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
  const sceneId = await createSceneViaUi(page, campaignId, scenarioId, 'The Corbitt House')
  return { campaignId, scenarioId, sceneId, scenePath: `/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}` }
}

test.describe('Scene Item links', () => {
  test('Keeper links an Item to a Scene and both pages list each other', async ({ page }) => {
    const scene = await prepareScene(page, 'Links')
    await createItemViaUi(page, scene.campaignId, "Walter Corbitt's diary")
    const keyId = await createItemViaUi(page, scene.campaignId, 'The cellar key', 'A rusty iron key.')

    await test.step('SP-UX-97: the Scene page lists no Items yet and offers to link one', async () => {
      await openScene(page, scene)
      await expect(sceneItemSection(page).getByRole('heading', { level: 2, name: 'Items' })).toBeVisible()
      await expect(sceneItemSection(page).getByText('No Items linked yet.')).toBeVisible()
      await expect(sceneItemSection(page).getByText("Players see an Item's name and description only when you reveal or give it.")).toBeVisible()
    })

    await test.step("SP-UX-98: the picker offers this Campaign's Items sorted by name and narrows by search", async () => {
      await openLinkItemPage(page)
      await expect(page.getByText('Scene: The Corbitt House')).toBeVisible()
      const choices = itemPicker(page).getByRole('radiogroup', { name: 'Items' }).getByRole('radio')
      await expect(choices).toHaveCount(2)
      await itemPicker(page).getByLabel('Search by name').fill('KEY')
      await expect(page.getByText('1 shown.')).toBeVisible()
      await expect(choices).toHaveCount(1)
      await itemPicker(page).getByLabel('Search by name').fill('zzz')
      await expect(itemPicker(page).getByText('No Items match this search.')).toBeVisible()
      await itemPicker(page).getByRole('button', { name: 'Clear search' }).click()
      await expect(itemPicker(page).getByLabel('Search by name')).toBeFocused()
      await expect(choices).toHaveCount(2)
    })

    await test.step('SP-UX-98, SP-A11Y-55: linking without a choice says "Choose an Item." at the picker and focuses a radio', async () => {
      await page.getByRole('button', { name: 'Link', exact: true }).click()
      await expect(itemPicker(page).getByText('Choose an Item.')).toBeVisible()
      await expect(itemPicker(page).getByRole('radiogroup', { name: 'Items' }).getByRole('radio').first()).toBeFocused()
    })

    await test.step('SP-UX-98, SP-A11Y-52: choosing an Item names it on a Selected line, and linking returns to the Scene with focus on it', async () => {
      await itemPicker(page).getByRole('radio', { name: 'The cellar key', exact: true }).click()
      await expect(itemPicker(page).getByText('Selected: The cellar key')).toBeVisible()
      await page.getByRole('button', { name: 'Link', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'The cellar key linked.' })).toBeVisible()
      await expect(sceneItemNames(page)).toHaveText(['The cellar key'])
      await expect(sceneItemSection(page).getByRole('link', { name: 'The cellar key' })).toBeFocused()
    })

    await test.step('SP-UX-97: the Item name links to its page, which lists the Scene (SP-UX-96)', async () => {
      await sceneItemSection(page).getByRole('link', { name: 'The cellar key' }).click()
      await expect(page).toHaveURL(new RegExp(`/campaigns/${scene.campaignId}/items/${keyId}$`))
      const scenes = page.getByRole('region', { name: 'Scenes' })
      await expect(scenes.getByRole('link', { name: 'The Corbitt House' })).toBeVisible()
      await expect(scenes).toContainText('Scenario: The Haunting')
      await expect(scenes).toContainText('Prepared')
    })

    await test.step('SP-UX-91: the list counts the Scene', async () => {
      await page.goto(`/campaigns/${scene.campaignId}/items`)
      await expect(page.getByRole('row', { name: /The cellar key/ })).toContainText('1')
    })
  })

  test('An Item already in the Scene can not be chosen again', async ({ page }) => {
    const scene = await prepareScene(page, 'Already')
    await createItemViaUi(page, scene.campaignId, "Walter Corbitt's diary")
    await createItemViaUi(page, scene.campaignId, 'The cellar key', 'A rusty iron key.')
    await openScene(page, scene)
    await openLinkItemPage(page)
    await linkItemViaUi(page, "Walter Corbitt's diary")

    await test.step('SP-UX-98, SP-A11Y-52: the linked Item is a disabled radio described by "Already in this Scene"', async () => {
      await openLinkItemPage(page)
      const linked = itemPicker(page).getByRole('radio', { name: "Walter Corbitt's diary", exact: true })
      await expect(linked).toBeDisabled()
      await expect(linked).toHaveAccessibleDescription('Already in this Scene')
      await expect(itemPicker(page).getByRole('radio', { name: 'The cellar key', exact: true })).toBeEnabled()
    })

    await test.step('SP-UX-98: Cancel returns to the Scene without a second link', async () => {
      await page.getByRole('link', { name: 'Cancel', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
      await expect(sceneItemNames(page)).toHaveText(["Walter Corbitt's diary"])
    })
  })

  test('Keeper links two Items and unlinks one', async ({ page }) => {
    const scene = await prepareScene(page, 'Unlink')
    await createItemViaUi(page, scene.campaignId, "Walter Corbitt's diary")
    const keyId = await createItemViaUi(page, scene.campaignId, 'The cellar key', 'A rusty iron key.')
    await openScene(page, scene)
    await openLinkItemPage(page)
    await linkItemViaUi(page, "Walter Corbitt's diary")
    await openLinkItemPage(page)
    await linkItemViaUi(page, 'The cellar key')

    await test.step('SP-UX-97: the Scene lists the Items in the order linked', async () => {
      await expect(sceneItemNames(page)).toHaveText(["Walter Corbitt's diary", 'The cellar key'])
    })

    await test.step('SP-UX-99, SP-A11Y-54: Unlink asks first, and Cancel keeps the link and returns focus to Unlink', async () => {
      await sceneItemSection(page).getByRole('button', { name: 'Unlink The cellar key' }).click()
      await expect(page.getByRole('alertdialog', { name: 'Unlink The cellar key?' })).toContainText('The cellar key stays in the Campaign with its Handouts.')
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
      await expect(sceneItemSection(page).getByRole('button', { name: 'Unlink The cellar key' })).toBeFocused()
      await expect(sceneItemNames(page)).toHaveCount(2)
    })

    await test.step('SP-UX-99, SP-A11Y-54: confirming unlinks, says so, and moves focus to the Items heading', async () => {
      await sceneItemSection(page).getByRole('button', { name: 'Unlink The cellar key' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Unlink', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'The cellar key unlinked.' })).toBeVisible()
      await expect(sceneItemNames(page)).toHaveText(["Walter Corbitt's diary"])
      await expect(sceneItemSection(page).getByRole('heading', { level: 2, name: 'Items' })).toBeFocused()
    })

    await test.step('SP-UX-99: the Item stays in the Campaign and no longer lists the Scene', async () => {
      await page.goto(`/campaigns/${scene.campaignId}/items/${keyId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'The cellar key' })).toBeVisible()
      await expect(page.getByText('Not linked to any Scene yet. Link it from a Scene page.')).toBeVisible()
    })
  })

  test("Other Campaigns' Items are not offered and Players and other Keepers can't use the link page or the link API", async ({ page, browser }) => {
    const scene = await prepareScene(page, 'Boundaries')
    const diaryId = await createItemViaUi(page, scene.campaignId, "Walter Corbitt's diary")
    const otherCampaignId = await createCampaignViaUi(page, `Elsewhere ${scene.campaignId.slice(0, 6)}`)
    const elsewhereId = await createItemViaUi(page, otherCampaignId, 'Elsewhere item', 'Not for this Campaign.')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const linked = await page.request.post(itemLinksApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId), {
      headers: { Authorization: bearer },
      data: { itemId: diaryId },
    })
    expect(linked.status(), 'POST item-links').toBe(201)
    const linkId = ((await linked.json()) as { id: string }).id
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, scene.campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))
    const newLinkPath = `${scene.scenePath}/item-links/new`

    try {
      await test.step("SP-UX-51, SP-UX-102: the Campaign's own Item is offered and another Campaign's is not", async () => {
        await page.goto(newLinkPath)
        // The Item list loads after the page; a loaded dev server can take longer than the default 5 s.
        await expect(itemPicker(page).getByRole('radio', { name: "Walter Corbitt's diary", exact: true })).toBeVisible()
        await expect(itemPicker(page).getByRole('radio', { name: 'Elsewhere item' })).toHaveCount(0)
      })

      await test.step('the API refuses an Item of another Campaign with a 400 keyed itemId', async () => {
        const response = await page.request.post(itemLinksApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId), {
          headers: { Authorization: bearer },
          data: { itemId: elsewhereId },
        })
        expect(response.status()).toBe(400)
        const body = (await response.json()) as { errors: Record<string, string[]> }
        expect(Object.keys(body.errors)).toEqual(['itemId'])
        expect(body.errors.itemId).toEqual(['Choose an Item of this Campaign.'])
      })

      await test.step('SP-UX-102: the Player sees "We couldn\'t find that Scene" on the link page and no Item text', async () => {
        await player.page.goto(newLinkPath)
        await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeVisible()
        await expect(player.page.getByText("Walter Corbitt's diary")).toHaveCount(0)
      })

      await test.step("the Player's bearer and another Keeper's bearer get 404 on every link endpoint", async () => {
        const players = await openAndCaptureBearer(player.page, `/campaigns/${scene.campaignId}`)
        const others = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        for (const [actor, token] of [[player.page, players], [otherKeeper.page, others]] as const) {
          const base = itemLinksApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId)
          const responses = [
            await actor.request.post(base, { headers: { Authorization: token }, data: { itemId: diaryId } }),
            await actor.request.delete(`${base}/${linkId}`, { headers: { Authorization: token } }),
          ]
          expect(responses.map((response) => response.status())).toEqual([404, 404])
        }
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })

  test('Keeper with no Items is offered to create one', async ({ page }) => {
    const scene = await prepareScene(page, 'Empty picker')
    await openScene(page, scene)
    await openLinkItemPage(page)

    await test.step('SP-UX-98: the picker says there are none and links to Create Item', async () => {
      await expect(itemPicker(page).getByText('No Items yet.')).toBeVisible()
      await expect(itemPicker(page).getByLabel('Search by name')).toHaveCount(0)
      await itemPicker(page).getByRole('link', { name: 'Create Item' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Create Item' })).toBeVisible()
    })
  })
})
