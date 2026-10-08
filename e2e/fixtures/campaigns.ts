import { expect, type Page } from '@playwright/test'

/**
 * Waits for the SPA to open a Campaign overview (`/campaigns/{id}`) and returns the Campaign id from its URL. A
 * successful create on New campaign replaces the form with the new Campaign's overview (specs/campaign-list/ux.md
 * section 5).
 */
export async function campaignIdFromOverviewUrl(page: Page): Promise<string> {
  await page.waitForURL(/\/campaigns\/[0-9a-f-]{36}$/i)
  const match = new URL(page.url()).pathname.match(/^\/campaigns\/([0-9a-f-]{36})$/i)
  if (!match) {
    throw new Error(`Could not parse Campaign id from the overview URL: ${page.url()}`)
  }
  return match[1]
}

/** The creation method labels of the Rules options checkboxes (specs/character-sheet/ux.md section 2). */
export type CreationMethodLabel = 'Standard rolling' | 'Point buy' | 'Quick fire'

const CREATION_METHOD_LABELS: CreationMethodLabel[] = ['Standard rolling', 'Point buy', 'Quick fire']

/**
 * Creates a Campaign through the real UI on New campaign and returns its id, read from the overview it opens.
 * Leaves the Player limit and the allowed creation methods (all three) at their defaults unless given.
 */
export async function createCampaignViaUi(
  page: Page,
  name: string,
  options: { playerLimit?: number; allowedCreationMethods?: CreationMethodLabel[] } = {},
): Promise<string> {
  await page.goto('/campaigns/new')
  await page.getByLabel(/campaign name/i).fill(name)
  if (options.playerLimit !== undefined) {
    await page.getByLabel(/player limit/i).fill(String(options.playerLimit))
  }
  if (options.allowedCreationMethods) {
    await page.getByRole('button', { name: /^rules options/i }).click()
    for (const label of CREATION_METHOD_LABELS.filter((method) => !options.allowedCreationMethods!.includes(method))) {
      await page.getByRole('checkbox', { name: new RegExp(`^${label}`, 'i') }).uncheck()
    }
  }
  await page.getByRole('button', { name: /create campaign/i }).click()
  const campaignId = await campaignIdFromOverviewUrl(page)
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  return campaignId
}

/** Issues a Campaign Invite on the Keeper's Settings page and returns the live token from the readonly input. */
export async function issueInviteViaUi(page: Page, campaignId: string): Promise<string> {
  await page.goto(`/campaigns/${campaignId}/settings`)
  await page.getByRole('button', { name: /issue invite link/i }).click()
  return readInviteTokenFromUi(page)
}

/** Reads the Invite token from the readonly input in the Invite section of Settings. */
export async function readInviteTokenFromUi(page: Page): Promise<string> {
  const input = page.getByLabel(/share this join link with your players/i)
  await expect(input).toBeVisible()
  const link = await input.inputValue()
  const match = link.match(/\/campaigns\/join\/(.+)$/)
  if (!match) {
    throw new Error(`Could not parse Invite token from join link: ${link}`)
  }
  return match[1]
}
