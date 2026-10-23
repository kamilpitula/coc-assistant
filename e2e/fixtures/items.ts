import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Locators and actions for Campaign Items (specs/scenario-preparation/ux.md sections 59 to 70): the Keeper's "Items" section
 * on the Overview, the list page, the Create and Item pages, the "Items" section of the Scene page, and the Link an Item page
 * with its picker.
 */
export function itemsSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Items', exact: true })
}

/** The names linked from the list page, in list order (the table; the narrow-screen list is hidden at this width). */
export function itemLinks(page: Page): Locator {
  return page.getByRole('table').getByRole('link')
}

/** The API URL of a Campaign's Items (or of one Item). */
export function itemsApiUrl(apiOrigin: string, campaignId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/items${suffix}`
}

/** The API URL of a Scene's Item links (or of one link). */
export function itemLinksApiUrl(apiOrigin: string, campaignId: string, scenarioId: string, sceneId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}/item-links${suffix}`
}

/** The Item id in the page URL (`.../items/{itemId}`). */
export function itemIdFromUrl(page: Page): string {
  const match = new URL(page.url()).pathname.match(/\/items\/([0-9a-f-]{36})$/i)
  if (!match) {
    throw new Error(`Could not parse the Item id from the URL: ${page.url()}`)
  }
  return match[1]
}

/** The Item form's Name field. */
export function itemNameField(page: Page): Locator {
  return page.getByLabel('Name', { exact: true })
}

/** The rich-text Player-facing description editor's editable area. */
export function itemDescriptionEditor(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Player-facing description', exact: true })
}

/** The rich-text Keeper notes editor's editable area. */
export function itemKeeperNotesEditor(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Keeper notes (optional)' })
}

/** Types plain text into a rich-text editor. */
export async function typeIntoEditor(page: Page, editor: Locator, text: string): Promise<void> {
  await editor.click()
  await page.keyboard.type(text)
}

/** Fills the Create Item form that is already open and submits it, then waits for the new Item's page. */
export async function submitItemForm(page: Page, name: string, description: string): Promise<string> {
  await itemNameField(page).fill(name)
  await typeIntoEditor(page, itemDescriptionEditor(page), description)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  return itemIdFromUrl(page)
}

/** Creates an Item through the Create Item page and returns its id. */
export async function createItemViaUi(page: Page, campaignId: string, name: string, description = 'A leather diary.'): Promise<string> {
  await page.goto(`/campaigns/${campaignId}/items/new`)
  await expect(page.getByRole('heading', { level: 1, name: 'Create Item' })).toBeVisible()
  return submitItemForm(page, name, description)
}

/** The "Items" section of the Scene page. */
export function sceneItemSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Items', exact: true })
}

/** The names linked from the Scene page's Items section, in the order linked. */
export function sceneItemNames(page: Page): Locator {
  return sceneItemSection(page).getByRole('listitem').getByRole('link')
}

/** The picker's fieldset. */
export function itemPicker(page: Page): Locator {
  return page.getByRole('group', { name: 'Item', exact: true })
}

/** Opens the Link an Item page from the Scene page that is already open and waits for it. */
export async function openLinkItemPage(page: Page): Promise<void> {
  await sceneItemSection(page).getByRole('link', { name: 'Link an Item' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Link an Item' })).toBeVisible()
}

/** Links an Item by name through the Link an Item page that is already open, then waits for the Scene page to confirm it. */
export async function linkItemViaUi(page: Page, itemName: string): Promise<void> {
  await itemPicker(page).getByRole('radio', { name: itemName, exact: true }).click()
  await page.getByRole('button', { name: 'Link', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: `${itemName} linked.` })).toBeVisible()
}
