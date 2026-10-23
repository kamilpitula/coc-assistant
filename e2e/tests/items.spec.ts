import { test, expect } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import {
  createItemViaUi,
  itemDescriptionEditor,
  itemKeeperNotesEditor,
  itemLinks,
  itemLinksApiUrl,
  itemNameField,
  itemsApiUrl,
  itemsSection,
  sceneItemNames,
  typeIntoEditor,
} from '../fixtures/items'
import { createScenarioViaUi } from '../fixtures/scenarios'
import { createSceneViaUi } from '../fixtures/scenes'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Keeper prepares an Item" (the creating part; the linking part is in
 * scene-item-links.spec.ts), "Deleting an Item linked only to Prepared Scenes removes its links", and "Campaign boundaries
 * isolate Scenario material" (the Player and API parts), and to specs/scenario-preparation/ux.md SP-UX-90 to SP-UX-95,
 * SP-UX-101, SP-UX-102, SP-UX-103, SP-A11Y-51, SP-A11Y-54, and SP-A11Y-55.
 *
 * Exceptions: Active and Finished Scenes cannot be seeded end to end until PBI-SPL-001 (ux.md section 70), so "An Item in a
 * played Scene cannot be deleted" and the played refusal of SP-UX-95 are covered by the seeded integration tests (ItemApiTests)
 * and by component tests. A held Item cannot exist before PBI-SPL-003, so "A held Item cannot be deleted" is covered by the
 * ItemService unit tests with a fake holder port. The size limits of SP-UX-92 and the 400 responses are covered by the form
 * service, component, and integration tests, where an end-to-end run would only repeat them slowly.
 */
test.describe('Items', () => {
  test('Keeper creates an Item and finds it in the list', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Items ${keeper.oid.slice(0, 6)}`)

    await test.step('SP-UX-90: the Overview offers Create and says there are none yet', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(itemsSection(page).getByRole('heading', { level: 2, name: 'Items' })).toBeVisible()
      await expect(itemsSection(page).getByText('No Items yet.')).toBeVisible()
      await expect(itemsSection(page).getByRole('link', { name: 'View all Items' })).toHaveCount(0)
      await itemsSection(page).getByRole('link', { name: 'Create Item' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Create Item' })).toBeVisible()
    })

    await test.step('SP-UX-92, SP-A11Y-55: submitting an empty form explains the name and the description in field order and saves nothing', async () => {
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByText('Enter a name.')).toBeVisible()
      await expect(page.getByText('Enter a Player-facing description.')).toBeVisible()
      await expect(itemNameField(page)).toBeFocused()
      await expect(itemNameField(page)).toHaveAccessibleDescription(/Enter a name\./)
    })

    await test.step('SP-UX-92: a name without a description explains the description and focuses it', async () => {
      await itemNameField(page).fill("Walter Corbitt's diary")
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByText('Enter a name.')).toHaveCount(0)
      await expect(page.getByText('Enter a Player-facing description.')).toBeVisible()
      await expect(itemDescriptionEditor(page)).toBeFocused()
    })

    await test.step('SP-UX-92, SP-UX-93: a name and a description open the new Item as "Held by no one." with its sections in order', async () => {
      await typeIntoEditor(page, itemDescriptionEditor(page), 'A leather diary, its last page torn out.')
      await typeIntoEditor(page, itemKeeperNotesEditor(page), 'The missing page names the cellar.')
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Item created.' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: "Walter Corbitt's diary" })).toBeVisible()
      await expect(page.getByText('Held by no one.')).toBeVisible()
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Player-facing description', 'Keeper notes', 'Handouts', 'Scenes'])
      await expect(page.getByText('A leather diary, its last page torn out.')).toBeVisible()
      await expect(page.getByText('The missing page names the cellar.')).toBeVisible()
      await expect(page.getByText('Not linked to any Scene yet. Link it from a Scene page.')).toBeVisible()
    })

    await test.step('SP-UX-91: the list shows every Item by name with its Scene count, sorted by name', async () => {
      await createItemViaUi(page, campaignId, 'The cellar key', 'A rusty iron key.')
      await page.goto(`/campaigns/${campaignId}/items`)
      await expect(itemLinks(page)).toHaveText(['The cellar key', "Walter Corbitt's diary"])
      await expect(page.getByRole('table').getByRole('cell', { name: '0', exact: true })).toHaveCount(2)
    })

    await test.step('SP-UX-91: searching narrows the list and announces the count; Clear search restores it', async () => {
      await page.getByLabel('Search by name').fill('CORB')
      await expect(itemLinks(page)).toHaveText(["Walter Corbitt's diary"])
      await expect(page.getByText('1 shown.')).toBeVisible()
      await page.getByLabel('Search by name').fill('zzz')
      await expect(page.getByText('No Items match this search.')).toBeVisible()
      await page.getByRole('button', { name: 'Clear search' }).click()
      await expect(itemLinks(page)).toHaveText(['The cellar key', "Walter Corbitt's diary"])
      await expect(page.getByLabel('Search by name')).toBeFocused()
    })

    await test.step('SP-UX-90: the Overview counts both and links to the list', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(itemsSection(page).getByText('2 Items.')).toBeVisible()
      await itemsSection(page).getByRole('link', { name: 'View all Items' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Items' })).toBeVisible()
    })
  })

  test('Keeper edits an Item and cancels an edit without losing it', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Edit ${keeper.oid.slice(0, 6)}`)
    await createItemViaUi(page, campaignId, "Walter Corbitt's diary", 'A leather diary.')

    await test.step('SP-UX-94, SP-A11Y-54: Edit swaps the content for a prefilled form and focuses the name', async () => {
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await expect(itemNameField(page)).toHaveValue("Walter Corbitt's diary")
      await expect(itemNameField(page)).toBeFocused()
      await expect(page.getByRole('heading', { level: 1, name: "Walter Corbitt's diary" })).toBeVisible()
    })

    await test.step('SP-UX-94: Cancel discards the edits without confirmation and returns focus to Edit', async () => {
      await itemNameField(page).fill('Something else')
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: "Walter Corbitt's diary" })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
    })

    await test.step('SP-UX-94: an empty name is explained at the field and saves nothing', async () => {
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await itemNameField(page).fill('')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByText('Enter a name.')).toBeVisible()
      await expect(itemNameField(page)).toBeFocused()
    })

    await test.step('SP-UX-94: Save shows "Item saved." with the new details after a reload', async () => {
      await itemNameField(page).fill('The diary of Walter Corbitt')
      await typeIntoEditor(page, itemDescriptionEditor(page), ' Its pages smell of the sea.')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Item saved.' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'The diary of Walter Corbitt' })).toBeVisible()
      await expect(page.getByText('Its pages smell of the sea.')).toBeVisible()
    })
  })

  test('Keeper deletes an Item linked only to a Prepared Scene and its link goes with it', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Delete ${keeper.oid.slice(0, 6)}`)
    const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
    const sceneId = await createSceneViaUi(page, campaignId, scenarioId, 'The Corbitt House')
    const itemId = await createItemViaUi(page, campaignId, "Walter Corbitt's diary")
    const bearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}/items/${itemId}`)
    const linked = await page.request.post(itemLinksApiUrl(API_ORIGIN, campaignId, scenarioId, sceneId), {
      headers: { Authorization: bearer },
      data: { itemId },
    })
    expect(linked.status(), 'POST item-links').toBe(201)

    await test.step('SP-UX-96: the Item page lists the Scene that links it', async () => {
      await page.goto(`/campaigns/${campaignId}/items/${itemId}`)
      await expect(page.getByRole('region', { name: 'Scenes' }).getByRole('link', { name: 'The Corbitt House' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Scenes' })).toContainText('Scenario: The Haunting')
      await expect(page.getByRole('region', { name: 'Scenes' })).toContainText('Prepared')
    })

    await test.step('SP-UX-95, SP-UX-101: the Delete dialog says what goes with the Item, and Cancel returns focus to Delete Item', async () => {
      await page.getByRole('button', { name: 'Delete Item', exact: true }).click()
      await expect(page.getByRole('alertdialog', { name: "Delete Walter Corbitt's diary?" })).toContainText(
        "This can't be undone. Its Handouts are deleted, and it is removed from any Prepared Scene it is part of.",
      )
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('button', { name: 'Delete Item', exact: true })).toBeFocused()
    })

    await test.step('SP-UX-95: confirming deletes the Item and the list says so', async () => {
      await page.getByRole('button', { name: 'Delete Item', exact: true }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: "Walter Corbitt's diary deleted." })).toBeVisible()
      await expect(page.getByText('No Items yet.')).toBeVisible()
    })

    await test.step('SP-UX-101: the Scene no longer lists the Item', async () => {
      await page.goto(`/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
      await expect(sceneItemNames(page)).toHaveCount(0)
      await expect(page.getByText('No Items linked yet.')).toBeVisible()
    })

    await test.step('SP-UX-95: the deleted Item answers "We couldn\'t find that Item"', async () => {
      await page.goto(`/campaigns/${campaignId}/items/${itemId}`)
      await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeVisible()
    })
  })

  test("Players and other Campaigns' Keepers can't use the Item pages or the Item API", async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Boundaries ${keeper.oid.slice(0, 6)}`)
    const itemId = await createItemViaUi(page, campaignId, "Walter Corbitt's diary")
    const bearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}`)
    const otherCampaignId = await createCampaignViaUi(page, `Elsewhere ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))

    try {
      await test.step('SP-UX-90: the Player\'s Overview has no Items section', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(player.page.getByRole('region', { name: 'At the table' })).toBeVisible()
        await expect(itemsSection(player.page)).toHaveCount(0)
      })

      await test.step('SP-UX-102: the Player sees "We couldn\'t find that Item" on every Item page and no Item text', async () => {
        for (const path of [`/campaigns/${campaignId}/items`, `/campaigns/${campaignId}/items/new`, `/campaigns/${campaignId}/items/${itemId}`]) {
          await player.page.goto(path)
          await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeVisible()
          await expect(player.page.getByText("Walter Corbitt's diary")).toHaveCount(0)
        }
      })

      await test.step("SP-UX-102: an Item of another Campaign is not found under this Campaign's address", async () => {
        await page.goto(`/campaigns/${otherCampaignId}/items/${itemId}`)
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeVisible()
      })

      await test.step("the Player's bearer and another Keeper's bearer get 404 on every Item endpoint", async () => {
        const players = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
        const others = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        for (const [actor, token] of [[player.page, players], [otherKeeper.page, others]] as const) {
          const responses = [
            await actor.request.get(itemsApiUrl(API_ORIGIN, campaignId), { headers: { Authorization: token } }),
            await actor.request.get(itemsApiUrl(API_ORIGIN, campaignId, `/${itemId}`), { headers: { Authorization: token } }),
            await actor.request.delete(itemsApiUrl(API_ORIGIN, campaignId, `/${itemId}`), { headers: { Authorization: token } }),
          ]
          expect(responses.map((response) => response.status())).toEqual([404, 404, 404])
        }
        const keeperResponse = await page.request.get(itemsApiUrl(API_ORIGIN, campaignId, `/${itemId}`), { headers: { Authorization: bearer } })
        expect(keeperResponse.status(), "the Keeper's own GET").toBe(200)
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })

  test('Item copy never calls an Item Gear, loot, inventory, an artifact, or an object', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Copy ${keeper.oid.slice(0, 6)}`)
    const itemId = await createItemViaUi(page, campaignId, 'The cellar key', 'A rusty iron key.')

    await test.step('SP-UX-103: the Overview, the list, the Create page, and the Item page use the word Item', async () => {
      for (const path of [`/campaigns/${campaignId}`, `/campaigns/${campaignId}/items`, `/campaigns/${campaignId}/items/new`, `/campaigns/${campaignId}/items/${itemId}`]) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        const text = (await page.locator('main').innerText()).replace(/The cellar key|A rusty iron key\./g, '')
        expect(text, `copy of ${path}`).not.toMatch(/\b(gear|loot|inventory|artifact|object)\b/i)
      }
    })
  })
})
