import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { createItemViaUi, itemsApiUrl } from '../fixtures/items'
import {
  PNG_BYTES,
  addHandoutViaUi,
  chooseHandoutImage,
  handoutLinks,
  handoutSection,
  handoutSubmitButton,
  handoutTitleField,
  kindRadio,
  openAddHandoutPage,
  visibilityRadio,
} from '../fixtures/scene-handouts'

/**
 * Traces to specs/scenario-preparation/spec.md Scenario "Keeper gives an Item a Handout" and to specs/scenario-preparation/ux.md
 * SP-UX-100 (with sections 41 to 44 and 50 to 58, which it reuses), SP-UX-102, and SP-A11Y-54.
 *
 * Exceptions: Active and Finished Scenes cannot be seeded end to end until PBI-SPL-001 (ux.md section 70), so "An Item in a
 * played Scene cannot be deleted" for a Handout (the sentence that replaces Delete Handout, and the 409 refusal) and "Replace
 * keeps the old file" are covered by the seeded integration tests (ItemHandoutApiTests, ItemHandoutFileApiTests) and by
 * component tests. A held Item cannot exist before PBI-SPL-003.
 */

interface ItemSetup {
  campaignId: string
  itemId: string
  itemPath: string
}

/** Creates a Campaign and the Item "Walter Corbitt's diary" as a new Keeper. */
async function prepareItem(page: Page, label: string): Promise<ItemSetup> {
  const keeper = newAccount('Keeper')
  await signIn(page, keeper)
  const campaignId = await createCampaignViaUi(page, `${label} ${keeper.oid.slice(0, 6)}`)
  const itemId = await createItemViaUi(page, campaignId, "Walter Corbitt's diary")
  return { campaignId, itemId, itemPath: `/campaigns/${campaignId}/items/${itemId}` }
}

test.describe('Item Handouts', () => {
  test('Keeper gives an Item a Text Handout and an Image Handout and moves one', async ({ page }) => {
    await prepareItem(page, 'Handouts')

    await test.step('SP-UX-100: the Item page lists no Handouts yet, with the hint and Add Handout, between Keeper notes and Scenes', async () => {
      await expect(handoutSection(page).getByRole('heading', { level: 2, name: 'Handouts' })).toBeVisible()
      await expect(handoutSection(page).getByText('No Handouts yet.')).toBeVisible()
      await expect(
        handoutSection(page).getByText('Player-facing Handouts reach Players only when you reveal them. Keeper-facing Handouts are never revealed.'),
      ).toBeVisible()
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Player-facing description', 'Keeper notes', 'Handouts', 'Scenes'])
    })

    await test.step('SP-UX-100: Add Handout names the Item and adds a Player-facing Text Handout, listed on the Item page', async () => {
      await openAddHandoutPage(page)
      await expect(page.getByText("Item: Walter Corbitt's diary")).toBeVisible()
      await addHandoutViaUi(page, { title: 'The last entry', kind: 'Text', visibility: 'Player-facing', text: 'I cannot stay here any longer.' })
      await expect(handoutLinks(page)).toHaveText(['The last entry'])
      const entry = handoutSection(page).getByRole('listitem').filter({ hasText: 'The last entry' })
      await expect(entry).toContainText('Text')
      await expect(entry).toContainText('Player-facing')
      await expect(handoutSection(page).getByRole('link', { name: 'The last entry' })).toBeFocused()
    })

    await test.step('SP-UX-100: an Image Handout is added with a PNG and listed after the first', async () => {
      await openAddHandoutPage(page)
      await handoutTitleField(page).fill('A photograph of the page')
      await kindRadio(page, 'Image').click()
      await visibilityRadio(page, 'Keeper-facing').click()
      await chooseHandoutImage(page, { name: 'page.png', buffer: PNG_BYTES })
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByRole('status').filter({ hasText: 'A photograph of the page added.' })).toBeVisible()
      await expect(handoutLinks(page)).toHaveText(['The last entry', 'A photograph of the page'])
    })

    await test.step('SP-UX-100: Move up changes the order and keeps focus on the moved button', async () => {
      await handoutSection(page).getByRole('button', { name: 'Move A photograph of the page up' }).click()
      await expect(handoutLinks(page)).toHaveText(['A photograph of the page', 'The last entry'])
      await expect(handoutSection(page).getByRole('button', { name: 'Move A photograph of the page down' })).toBeFocused()
      await page.reload()
      await expect(handoutLinks(page)).toHaveText(['A photograph of the page', 'The last entry'])
    })
  })

  test('Keeper opens an Item Handout, goes back to the Item, and deletes it', async ({ page }) => {
    const item = await prepareItem(page, 'Open and delete')
    await openAddHandoutPage(page)
    await addHandoutViaUi(page, { title: 'The last entry', kind: 'Text', visibility: 'Player-facing', text: 'I cannot stay here any longer.' })

    await test.step('SP-UX-100: the Handout page says "Item: {name}", shows the text, and offers Edit and Delete Handout', async () => {
      await handoutLinks(page).filter({ hasText: 'The last entry' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'The last entry' })).toBeVisible()
      await expect(page.getByText("Item: Walter Corbitt's diary")).toBeVisible()
      await expect(page.getByText('I cannot stay here any longer.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Delete Handout' })).toBeVisible()
    })

    await test.step('SP-UX-100: "Back to the Item" returns to the Item page', async () => {
      await page.getByRole('link', { name: 'Back to the Item' }).click()
      await expect(page).toHaveURL(new RegExp(`${item.itemPath}$`))
      await expect(page.getByRole('heading', { level: 1, name: "Walter Corbitt's diary" })).toBeVisible()
    })

    await test.step('SP-UX-100: Edit is always offered and saves a new title', async () => {
      await handoutLinks(page).filter({ hasText: 'The last entry' }).click()
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await handoutTitleField(page).fill('The final entry')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Handout saved.' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: 'The final entry' })).toBeVisible()
    })

    await test.step('SP-UX-100: Delete Handout asks first, and confirming returns to the Item with focus on the Handouts heading', async () => {
      await page.getByRole('button', { name: 'Delete Handout' }).click()
      await expect(page.getByRole('alertdialog', { name: 'Delete The final entry?' })).toContainText("This can't be undone.")
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('button', { name: 'Delete Handout' })).toBeFocused()
      await page.getByRole('button', { name: 'Delete Handout' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete Handout' }).click()
      await expect(page).toHaveURL(new RegExp(`${item.itemPath}$`))
      await expect(page.getByRole('status').filter({ hasText: 'The final entry deleted.' })).toBeVisible()
      await expect(handoutSection(page).getByText('No Handouts yet.')).toBeVisible()
      await expect(handoutSection(page).getByRole('heading', { level: 2, name: 'Handouts' })).toBeFocused()
    })
  })

  test('Keeper deleting an Item deletes its Handouts', async ({ page }) => {
    const item = await prepareItem(page, 'Delete with Handouts')
    await openAddHandoutPage(page)
    await addHandoutViaUi(page, { title: 'The last entry', kind: 'Text', visibility: 'Player-facing', text: 'I cannot stay here any longer.' })
    const handoutPath = (await handoutLinks(page).first().getAttribute('href')) ?? ''
    const bearer = await openAndCaptureBearer(page, item.itemPath)

    await test.step('SP-UX-95: deleting the Item removes it with its Handouts', async () => {
      await page.getByRole('button', { name: 'Delete Item', exact: true }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: "Walter Corbitt's diary deleted." })).toBeVisible()
    })

    await test.step('the Handout is gone too: its page is not found and the Item API answers 404', async () => {
      expect(handoutPath, 'the Handout link of the Item page').toContain('/handouts/')
      await page.goto(handoutPath)
      await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeVisible()
      const response = await page.request.get(itemsApiUrl(API_ORIGIN, item.campaignId, `/${item.itemId}`), { headers: { Authorization: bearer } })
      expect(response.status()).toBe(404)
    })
  })

  test("Players and other Campaigns' Keepers can't use the Item Handout pages or API", async ({ page, browser }) => {
    const item = await prepareItem(page, 'Handout boundaries')
    await openAddHandoutPage(page)
    await addHandoutViaUi(page, { title: 'The last entry', kind: 'Text', visibility: 'Player-facing', text: 'I cannot stay here any longer.' })
    const handoutId = ((await handoutLinks(page).first().getAttribute('href')) ?? '').split('/').pop() ?? ''
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, item.campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))

    try {
      await test.step('SP-UX-102: the Player sees "We couldn\'t find that Item" on the Handout pages and no Handout text', async () => {
        for (const path of [`${item.itemPath}/handouts/new`, `${item.itemPath}/handouts/${handoutId}`]) {
          await player.page.goto(path)
          await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeVisible()
          await expect(player.page.getByText('I cannot stay here any longer.')).toHaveCount(0)
        }
      })

      await test.step('SP-UX-100: an unknown Handout id shows "We couldn\'t find that Handout" with "Back to the Item"', async () => {
        await page.goto(`${item.itemPath}/handouts/00000000-0000-0000-0000-000000000000`)
        // The route loads after the page; a loaded dev server can take longer than the default 5 s.
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Handout" })).toBeVisible({ timeout: 20_000 })
        await page.getByRole('link', { name: 'Back to the Item' }).click()
        await expect(page).toHaveURL(new RegExp(`${item.itemPath}$`))
      })

      await test.step("the Player's bearer and another Keeper's bearer get 404 on every Item Handout endpoint", async () => {
        const players = await openAndCaptureBearer(player.page, `/campaigns/${item.campaignId}`)
        const others = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        for (const [actor, token] of [[player.page, players], [otherKeeper.page, others]] as const) {
          const base = itemsApiUrl(API_ORIGIN, item.campaignId, `/${item.itemId}/handouts`)
          const responses = [
            await actor.request.get(`${base}/${handoutId}`, { headers: { Authorization: token } }),
            await actor.request.delete(`${base}/${handoutId}`, { headers: { Authorization: token } }),
            await actor.request.get(`${base}/${handoutId}/file`, { headers: { Authorization: token } }),
          ]
          expect(responses.map((response) => response.status())).toEqual([404, 404, 404])
        }
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })
})
