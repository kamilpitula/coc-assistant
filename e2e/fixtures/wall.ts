import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Locators and actions for the Campaign Wall (specs/campaign-wall/ux.md) and its overview preview
 * (specs/campaign-overview/ux.md section 7).
 */
export function wallComposer(page: Page): Locator {
  return page.getByRole('textbox', { name: 'New Wall Entry' })
}

export function wallPost(page: Page): Locator {
  return page.getByRole('button', { name: 'Add to the Wall' })
}

/** The Wall page entry that contains this text. */
export function wallEntry(page: Page, text: string): Locator {
  return page.getByRole('listitem').filter({ hasText: text })
}

/** The overview's Wall preview. */
export function wallPreview(page: Page): Locator {
  return page.getByRole('region', { name: 'Wall' })
}

/** Opens the Wall page through the Campaign navigation. */
export async function openWall(page: Page, campaignId: string): Promise<void> {
  await page.goto(`/campaigns/${campaignId}/wall`)
  await expect(page.getByRole('heading', { level: 1, name: 'Wall' })).toBeVisible()
}

/** Adds an entry through the compose box; the Keeper may choose "Keeper only". */
export async function addWallEntryViaUi(page: Page, text: string, visibility: 'Public' | 'Keeper only' = 'Public'): Promise<void> {
  await wallComposer(page).fill(text)
  if (visibility === 'Keeper only') {
    await page.getByRole('radio', { name: 'Keeper only' }).check()
  }
  await wallPost(page).click()
  await expect(wallEntry(page, text)).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Wall Entry added.' })).toBeVisible()
}
