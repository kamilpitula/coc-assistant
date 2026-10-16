import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Locators and actions for Scenario Preparation (specs/scenario-preparation/ux.md): the Keeper's "Scenarios" section
 * on the Overview, the Create Scenario page, and the Scenario page.
 */
export function scenariosSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Scenarios' })
}

/** The titles linked from the Overview section, in list order. */
export function scenarioLinks(page: Page): Locator {
  return scenariosSection(page).getByRole('listitem').getByRole('link')
}

/** The Create Scenario form's Title field. */
export function scenarioTitleField(page: Page): Locator {
  return page.getByLabel('Title', { exact: true })
}

/** The Create Scenario form's Keeper notes field. */
export function scenarioNotesField(page: Page): Locator {
  return page.getByLabel('Keeper notes (optional)')
}

/** The API URL of a Campaign's Scenarios (or of one Scenario, or of the order resource). */
export function scenariosApiUrl(apiOrigin: string, campaignId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/scenarios${suffix}`
}

/**
 * Fills the Create Scenario form that is already open and submits it, then waits for the new Scenario's page.
 * Returns the new Scenario's id, read from the URL.
 */
export async function submitScenarioForm(page: Page, title: string, keeperNotes = ''): Promise<string> {
  await scenarioTitleField(page).fill(title)
  if (keeperNotes !== '') {
    await scenarioNotesField(page).fill(keeperNotes)
  }
  await page.getByRole('button', { name: 'Create Scenario' }).click()
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  return scenarioIdFromUrl(page)
}

/** Creates a Scenario through the Create Scenario page and returns its id. */
export async function createScenarioViaUi(page: Page, campaignId: string, title: string, keeperNotes = ''): Promise<string> {
  await page.goto(`/campaigns/${campaignId}/scenarios/new`)
  await expect(page.getByRole('heading', { level: 1, name: 'Create Scenario' })).toBeVisible()
  return submitScenarioForm(page, title, keeperNotes)
}

/** The Scenario id in the page URL (`/campaigns/{campaignId}/scenarios/{scenarioId}`). */
export function scenarioIdFromUrl(page: Page): string {
  const match = new URL(page.url()).pathname.match(/\/scenarios\/([0-9a-f-]{36})$/i)
  if (!match) {
    throw new Error(`Could not parse the Scenario id from the URL: ${page.url()}`)
  }
  return match[1]
}
