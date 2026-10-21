import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Locators and actions for Scene links (specs/scenario-preparation/ux.md sections 31 to 39): the "Non-Player Entities"
 * section of the Scene page, the Link and Edit link pages, and the picker.
 */
export function linkSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Non-Player Entities' })
}

/** The Player-facing names of the links on the Scene page, in the order linked. */
export function linkHeadings(page: Page): Locator {
  return linkSection(page).getByRole('heading', { level: 3 })
}

/** The API URL of a Scene's links (or of one link). */
export function linksApiUrl(apiOrigin: string, campaignId: string, scenarioId: string, sceneId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}/non-player-entity-links${suffix}`
}

/** The picker's fieldset. */
export function picker(page: Page): Locator {
  return page.getByRole('group', { name: 'Non-Player Entity', exact: true })
}

/** The Player-facing name field. */
export function playerFacingNameField(page: Page): Locator {
  return page.getByLabel('Player-facing name', { exact: true })
}

/** The rich-text Player-facing description editor's editable area. */
export function playerFacingDescriptionEditor(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Player-facing description (optional)' })
}

/**
 * The form's submit button. The rich-text toolbar has a "Link" button too, so the submit button is picked by its type
 * rather than by position.
 */
export function submitButton(page: Page, name: string): Locator {
  return page.locator('button[type="submit"]').filter({ hasText: name })
}

/** Opens the Link a Non-Player Entity page from the Scene page and waits for it. */
export async function openLinkPage(page: Page): Promise<void> {
  await linkSection(page).getByRole('link', { name: 'Link a Non-Player Entity' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Link a Non-Player Entity' })).toBeVisible()
}

/** Links an entity by name through the Link page that is already open, with a Player-facing name, and waits for the Scene page. */
export async function linkEntityViaUi(page: Page, entityName: string, playerFacingName: string): Promise<void> {
  await picker(page).getByRole('radio', { name: entityName, exact: true }).click()
  await playerFacingNameField(page).fill(playerFacingName)
  await submitButton(page, 'Link').click()
  await expect(page.getByRole('status').filter({ hasText: `${playerFacingName} linked.` })).toBeVisible()
}
