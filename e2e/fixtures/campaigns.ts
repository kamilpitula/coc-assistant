import { expect, type Page } from '@playwright/test'

/**
 * Creates a Campaign through the real UI and returns its id (parsed from the "Manage its invite" link, which opens
 * the Campaign's Settings).
 * Leaves the Player limit at its default unless `playerLimit` is given.
 */
export async function createCampaignViaUi(
  page: Page,
  name: string,
  options: { playerLimit?: number } = {},
): Promise<string> {
  await page.goto('/campaigns')
  await page.getByLabel(/campaign name/i).fill(name)
  if (options.playerLimit !== undefined) {
    await page.getByLabel(/player limit/i).fill(String(options.playerLimit))
  }
  await page.getByRole('button', { name: /create campaign/i }).click()

  const manageLink = page.getByRole('link', { name: /manage its invite/i })
  await expect(manageLink).toBeVisible()

  const href = await manageLink.getAttribute('href')
  const match = href?.match(/\/campaigns\/([0-9a-f-]+)/i)
  if (!match) {
    throw new Error(`Could not parse Campaign id from manage link href: ${href}`)
  }
  return match[1]
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
