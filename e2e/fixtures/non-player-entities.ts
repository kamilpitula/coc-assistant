import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Locators and actions for Non-Player Entities (specs/scenario-preparation/ux.md sections 21 to 30): the Keeper's
 * "Non-Player Entities" section on the Overview, the list page, the Create page, and the Human NPC profile page.
 */
export function nonPlayerEntitiesSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Non-Player Entities' })
}

/** The names linked from the list page, in list order (the table; the narrow-screen list is hidden at this width). */
export function nonPlayerEntityLinks(page: Page): Locator {
  return page.getByRole('table').getByRole('link')
}

/** The API URL of a Campaign's Human NPCs (or of one Human NPC). */
export function humanNpcsApiUrl(apiOrigin: string, campaignId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/human-npcs${suffix}`
}

/** The API URL of a Campaign's Non-Player Entity list. */
export function nonPlayerEntitiesApiUrl(apiOrigin: string, campaignId: string): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/non-player-entities`
}

/** The Human NPC id in the page URL (`.../human-npcs/{humanNpcId}`). */
export function humanNpcIdFromUrl(page: Page): string {
  const match = new URL(page.url()).pathname.match(/\/human-npcs\/([0-9a-f-]{36})$/i)
  if (!match) {
    throw new Error(`Could not parse the Human NPC id from the URL: ${page.url()}`)
  }
  return match[1]
}

/** Fills the Create page that is already open for a Human NPC and submits it, then waits for the new profile page. */
export async function submitHumanNpcForm(page: Page, name: string, age: string): Promise<string> {
  await page.getByRole('radio', { name: 'Human NPC' }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Age', { exact: true }).fill(age)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  return humanNpcIdFromUrl(page)
}

/** Creates a Human NPC through the Create page and returns its id. */
export async function createHumanNpcViaUi(page: Page, campaignId: string, name: string, age: string): Promise<string> {
  await page.goto(`/campaigns/${campaignId}/non-player-entities/new`)
  await expect(page.getByRole('heading', { level: 1, name: 'Create Non-Player Entity' })).toBeVisible()
  return submitHumanNpcForm(page, name, age)
}

/** Opens the profile editor and waits for it. */
export async function openEditor(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
}

/** Saves the open editor and waits for the view. */
export async function saveEditor(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Human NPC saved.' })).toBeVisible()
}

/** The API URL of a Campaign's Mythos Creatures (or of one Mythos Creature). */
export function mythosCreaturesApiUrl(apiOrigin: string, campaignId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/mythos-creatures${suffix}`
}

/** The Mythos Creature id in the page URL (`.../mythos-creatures/{mythosCreatureId}`). */
export function mythosCreatureIdFromUrl(page: Page): string {
  const match = new URL(page.url()).pathname.match(/\/mythos-creatures\/([0-9a-f-]{36})$/i)
  if (!match) {
    throw new Error(`Could not parse the Mythos Creature id from the URL: ${page.url()}`)
  }
  return match[1]
}

/** Fills the Create page that is already open for a Mythos Creature (a type and a name) and submits it, then waits for the profile page. */
export async function submitMythosCreatureForm(page: Page, name: string): Promise<string> {
  await page.getByRole('radio', { name: 'Mythos Creature' }).click()
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  return mythosCreatureIdFromUrl(page)
}

/** Creates a Mythos Creature through the Create page and returns its id. */
export async function createMythosCreatureViaUi(page: Page, campaignId: string, name: string): Promise<string> {
  await page.goto(`/campaigns/${campaignId}/non-player-entities/new`)
  await expect(page.getByRole('heading', { level: 1, name: 'Create Non-Player Entity' })).toBeVisible()
  return submitMythosCreatureForm(page, name)
}

/** Saves the open Mythos Creature editor and waits for the view. */
export async function saveMythosCreatureEditor(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Mythos Creature saved.' })).toBeVisible()
}

/** The Details fieldset of the open Monster Profile editor, which scopes the Name field away from the attack names. */
export function detailsFieldset(page: Page): Locator {
  return page.getByRole('group', { name: 'Details' })
}
