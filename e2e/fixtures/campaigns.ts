import { expect, type Page } from '@playwright/test'

/** Creates a Campaign through the real UI and returns its id (parsed from the "Manage its invite" link). */
export async function createCampaignViaUi(page: Page, name: string): Promise<string> {
  await page.goto('/campaigns')
  await page.getByLabel(/campaign name/i).fill(name)
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

/** Issues a Campaign Invite through the Keeper UI and returns the live token from the readonly input. */
export async function issueInviteViaUi(page: Page, campaignId: string): Promise<string> {
  await page.goto(`/campaigns/${campaignId}`)
  await page.getByRole('button', { name: /issue invite link/i }).click()
  return readInviteTokenFromUi(page)
}

/** Reads the Invite token from the readonly input on the Campaign Invite page. */
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
