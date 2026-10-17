import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Locators and actions for Scenes (specs/scenario-preparation/ux.md sections 11 to 20): the Keeper's "Scenes" section on
 * the Scenario page, the Create Scene page, and the Scene page with its rich-text Keeper notes editor.
 */
export function scenesSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Scenes' })
}

/** The titles linked from the Scenes section, in prepared order. */
export function sceneLinks(page: Page): Locator {
  return scenesSection(page).getByRole('listitem').getByRole('link')
}

/** The Scene form's Title field. */
export function sceneTitleField(page: Page): Locator {
  return page.getByLabel('Title', { exact: true })
}

/** The Scene form's Location field. */
export function sceneLocationField(page: Page): Locator {
  return page.getByLabel('Location (optional)')
}

/** The rich-text Keeper notes editor's editable area. */
export function keeperNotesEditor(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Keeper notes (optional)' })
}

/** A button of the editor's formatting toolbar, such as "Bold" or "Bulleted list". */
export function formattingButton(page: Page, name: string): Locator {
  return page.getByRole('toolbar', { name: 'Formatting' }).getByRole('button', { name, exact: true })
}

/** The API URL of a Scenario's Scenes (or of one Scene, or of the order resource). */
export function scenesApiUrl(apiOrigin: string, campaignId: string, scenarioId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes${suffix}`
}

/** The Scene id in the page URL (`.../scenarios/{scenarioId}/scenes/{sceneId}`). */
export function sceneIdFromUrl(page: Page): string {
  const match = new URL(page.url()).pathname.match(/\/scenes\/([0-9a-f-]{36})$/i)
  if (!match) {
    throw new Error(`Could not parse the Scene id from the URL: ${page.url()}`)
  }
  return match[1]
}

/** Fills the Create Scene form that is already open and submits it, then waits for the new Scene's page. */
export async function submitSceneForm(page: Page, title: string, location = ''): Promise<string> {
  await sceneTitleField(page).fill(title)
  if (location !== '') {
    await sceneLocationField(page).fill(location)
  }
  await page.getByRole('button', { name: 'Create Scene' }).click()
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  return sceneIdFromUrl(page)
}

/** Creates a Scene through the Create Scene page and returns its id. */
export async function createSceneViaUi(
  page: Page,
  campaignId: string,
  scenarioId: string,
  title: string,
  location = '',
): Promise<string> {
  await page.goto(`/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/new`)
  await expect(page.getByRole('heading', { level: 1, name: 'Create Scene' })).toBeVisible()
  return submitSceneForm(page, title, location)
}
