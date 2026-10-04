import { test, expect, type Locator, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { approveFromOverview, joinAsNewPlayer, submitValidInvestigatorViaUi } from '../fixtures/investigators'

/**
 * Traces to specs/campaign-list/spec.md Scenarios and specs/campaign-list/ux.md section 9:
 * - "Keeper and Player Campaigns are listed in their sections" (CL-UX-1, CL-UX-2)
 * - "A section without Campaigns is not shown" (CL-UX-2)
 * - "Keeper item shows Players, Approved Investigators, and reviews" (CL-UX-3)
 * - "Player item shows the Keeper and the Player's own Investigator" (CL-UX-4)
 * - "Player item never reveals other Players' progress" (CL-UX-4, guardrail)
 * - "Opening a Campaign from the list" (CL-UX-5)
 * - "Account without Campaigns sees how to start" (CL-UX-6)
 * - "Creating a Campaign is its own journey" (CL-UX-7)
 * - "Signed-in Accounts skip the home page" (CL-UX-8)
 * - "Signed-out visitors are asked to sign in" (CL-UX-9)
 * - "The list recovers from a failed load" (CL-UX-10)
 * plus CL-UX-11 (refetch when the tab regains focus, without skeletons).
 * The per-role wire shapes and ordering by timestamp are covered by
 * backend/tests/CocAssistant.Api.IntegrationTests (CampaignListApiTests).
 */

const HOME_HEADING = 'Call of Cthulhu Campaign Assistant'

function section(page: Page, name: 'You run' | 'You play in'): Locator {
  return page.getByRole('region', { name })
}

function listItem(page: Page, campaignName: string): Locator {
  return page.getByRole('listitem').filter({ has: page.getByRole('link', { name: campaignName, exact: true }) })
}

/** Joins the Campaign through the Invite token as the Account already signed in on this page. */
async function joinWithToken(page: Page, token: string): Promise<void> {
  await page.goto(`/campaigns/join/${token}`)
  await page.getByRole('button', { name: /join this campaign/i }).click()
  await expect(page.getByText(/you have joined the campaign as a player/i)).toBeVisible()
}

/** Tells TanStack Query the tab became visible again, as returning to the browser tab does. */
async function returnToTab(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
}

test.describe('Campaign List', () => {
  test('Keeper and Player Campaigns are listed in their sections and open their overview', async ({ page, browser }) => {
    const account = newAccount('Member')
    const suffix = account.oid.slice(0, 6)
    const olderKept = `Older kept ${suffix}`
    const newerKept = `Newer kept ${suffix}`
    const joinedName = `Joined ${suffix}`
    await signIn(page, account)
    await createCampaignViaUi(page, olderKept)
    const newerKeptId = await createCampaignViaUi(page, newerKept)

    const otherKeeper = newAccount('Keeper')
    const other = await signInNewContext(browser, otherKeeper)
    try {
      const joinedId = await createCampaignViaUi(other.page, joinedName)
      await joinWithToken(page, await issueInviteViaUi(other.page, joinedId))

      await page.goto('/campaigns')

      await test.step('CL-UX-1: the page is "Your campaigns" with New campaign and no create form', async () => {
        await expect(page.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeVisible()
        await expect(page.getByRole('link', { name: 'New campaign' })).toHaveAttribute('href', '/campaigns/new')
        await expect(page.getByLabel(/campaign name/i)).toHaveCount(0)
      })

      await test.step('CL-UX-2: "You run" comes before "You play in", each newest first', async () => {
        await expect(page.getByRole('heading', { level: 2 })).toHaveText(['You run', 'You play in'])
        await expect(section(page, 'You run').getByRole('heading', { level: 3 })).toHaveText([newerKept, olderKept])
        await expect(section(page, 'You play in').getByRole('heading', { level: 3 })).toHaveText([joinedName])
      })

      await test.step('CL-UX-4: the Player item shows the Keeper and no limit', async () => {
        const item = listItem(page, joinedName)
        await expect(item).toContainText(`1920s, Keeper: ${otherKeeper.name}`)
        await expect(item).toContainText('1 Player, No Investigators approved yet')
        await expect(item).toContainText('No Investigator yet')
      })

      await test.step('CL-UX-5: clicking anywhere on an item opens its overview', async () => {
        const item = listItem(page, newerKept)
        await expect(item).toContainText('0 of 8 Players, No Investigators approved yet')
        // The item's centre is on its details, not its name; the stretched name link covers the whole item.
        await item.click()
        await expect(page).toHaveURL(new RegExp(`/campaigns/${newerKeptId}$`))
        await expect(page.getByRole('heading', { level: 1, name: newerKept })).toBeVisible()
      })

      await test.step('CL-UX-5: Enter on an item name opens its overview', async () => {
        await page.goBack()
        await page.getByRole('link', { name: joinedName, exact: true }).focus()
        await page.keyboard.press('Enter')
        await expect(page).toHaveURL(new RegExp(`/campaigns/${joinedId}$`))
      })
    } finally {
      await other.context.close()
    }
  })

  test('Keeper and Player items show counts, reviews, and the own Investigator, and refresh on focus', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignName = `Counts ${keeper.oid.slice(0, 6)}`
    const campaignId = await createCampaignViaUi(page, campaignName, { playerLimit: 4 })
    const token = await issueInviteViaUi(page, campaignId)
    const submitter = await joinAsNewPlayer(browser, token, 'Submitter')
    const waiting = await joinAsNewPlayer(browser, token, 'Waiting')

    try {
      await submitValidInvestigatorViaUi(submitter.page, campaignId, 'Harvey Walters')

      await test.step('CL-UX-3: the Keeper item shows Players with the limit and the review awaiting', async () => {
        await page.goto('/campaigns')
        const item = listItem(page, campaignName)
        await expect(item).toContainText('1920s')
        await expect(item).toContainText('2 of 4 Players, No Investigators approved yet')
        await expect(item).toContainText('1 awaiting review')
      })

      await test.step('CL-UX-4: the Player item shows the own Investigator status and name', async () => {
        await submitter.page.goto('/campaigns')
        const item = listItem(submitter.page, campaignName)
        await expect(item).toContainText('Submitted - waiting for your Keeper')
        await expect(item).toContainText('Your Investigator: Harvey Walters')
        await expect(item).toContainText('2 Players, No Investigators approved yet')
      })

      await test.step("CL-UX-4 guardrail: another Player's submitted Investigator is not revealed", async () => {
        await waiting.page.goto('/campaigns')
        const item = listItem(waiting.page, campaignName)
        await expect(item).toContainText(`1920s, Keeper: ${keeper.name}`)
        await expect(item).toContainText('2 Players, No Investigators approved yet')
        await expect(item).toContainText('No Investigator yet')
        await expect(item).not.toContainText('of 4')
        await expect(item).not.toContainText('awaiting review')
      })

      await test.step('CL-UX-2: an Account that only plays sees no "You run" section', async () => {
        await expect(section(waiting.page, 'You play in')).toBeVisible()
        await expect(section(waiting.page, 'You run')).toHaveCount(0)
      })

      await approveFromOverview(page, campaignId, 'Harvey Walters')

      await test.step('CL-UX-3: once approved, the Keeper item counts it and shows no review badge', async () => {
        await page.goto('/campaigns')
        const item = listItem(page, campaignName)
        await expect(item).toContainText('2 of 4 Players, 1 Investigator approved')
        await expect(item).not.toContainText('awaiting review')
      })

      await test.step('CL-UX-11: returning to the tab refetches the list without skeletons', async () => {
        const item = listItem(waiting.page, campaignName)
        await expect(item).toContainText('No Investigators approved yet')
        await returnToTab(waiting.page)
        await expect(item).toContainText('2 Players, 1 Investigator approved')
        await expect(waiting.page.locator('[aria-busy="true"]')).toHaveCount(0)
      })
    } finally {
      await submitter.context.close()
      await waiting.context.close()
    }
  })

  test('An Account without Campaigns starts one on its own page', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignName = `Fresh ${keeper.oid.slice(0, 6)}`
    await page.goto('/campaigns')

    await test.step('CL-UX-6: the empty list explains joining and offers New campaign', async () => {
      const empty = page.getByRole('region', { name: 'No campaigns yet' })
      await expect(empty).toContainText(
        'To join a Campaign, open the invite link your Keeper sent you. To run your own, start a new one.',
      )
      await expect(empty.getByRole('link', { name: 'New campaign' })).toBeVisible()
    })

    await test.step('CL-UX-7: New campaign opens its own page, and Cancel returns to the list', async () => {
      await page.getByRole('region', { name: 'No campaigns yet' }).getByRole('link', { name: 'New campaign' }).click()
      await expect(page).toHaveURL(/\/campaigns\/new$/)
      await expect(page.getByRole('heading', { level: 1, name: 'New campaign' })).toBeVisible()
      await page.getByRole('link', { name: 'Cancel' }).click()
      await expect(page).toHaveURL(/\/campaigns$/)
    })

    await test.step('CL-UX-7: creating opens the overview, and Back returns to the list showing it', async () => {
      await page.getByRole('region', { name: 'No campaigns yet' }).getByRole('link', { name: 'New campaign' }).click()
      await page.getByLabel(/campaign name/i).fill(campaignName)
      await page.getByRole('button', { name: /create campaign/i }).click()
      await expect(page.getByRole('heading', { level: 1, name: campaignName })).toBeVisible()
      await expect(page).toHaveURL(/\/campaigns\/[0-9a-f-]{36}$/i)

      await page.goBack()
      await expect(page).toHaveURL(/\/campaigns$/)
      await expect(section(page, 'You run').getByRole('link', { name: campaignName, exact: true })).toBeVisible()
    })
  })

  test('Signed-in Accounts skip the home page', async ({ page }) => {
    const account = newAccount('Member')

    await test.step('CL-UX-8: signing in lands on Campaigns', async () => {
      await signIn(page, account)
      await expect(page).toHaveURL(/\/campaigns$/)
      await expect(page.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeVisible()
    })

    await test.step('CL-UX-8: opening / shows Campaigns without the home page, and Back skips /', async () => {
      await page.goto('/campaigns/new')
      await expect(page.getByRole('heading', { level: 1, name: 'New campaign' })).toBeVisible()
      await page.addInitScript((heading) => {
        const record = window as unknown as { homeHeadingSeen: boolean }
        record.homeHeadingSeen = false
        new MutationObserver(() => {
          if (Array.from(document.querySelectorAll('h1')).some((h1) => h1.textContent === heading)) {
            record.homeHeadingSeen = true
          }
        }).observe(document, { childList: true, subtree: true, characterData: true })
      }, HOME_HEADING)

      await page.goto('/')
      await expect(page).toHaveURL(/\/campaigns$/)
      await expect(page.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeVisible()
      expect(await page.evaluate(() => (window as unknown as { homeHeadingSeen: boolean }).homeHeadingSeen)).toBe(false)

      await page.goBack()
      await expect(page).toHaveURL(/\/campaigns\/new$/)
    })
  })

  test('Signed-out visitors are asked to sign in', async ({ page }) => {
    const listRequests: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/campaigns') {
        listRequests.push(request.url())
      }
    })

    await test.step('CL-UX-9: Campaigns shows the sign-in prompt', async () => {
      await page.goto('/campaigns')
      const main = page.getByRole('main')
      await expect(main.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeVisible()
      await expect(main.getByText('Sign in to see your campaigns.')).toBeVisible()
      await expect(main.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    })

    await test.step('CL-UX-9: New campaign shows the sign-in prompt', async () => {
      await page.goto('/campaigns/new')
      const main = page.getByRole('main')
      await expect(main.getByRole('heading', { level: 1, name: 'New campaign' })).toBeVisible()
      await expect(main.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
      await expect(main.getByLabel(/campaign name/i)).toHaveCount(0)
    })

    await test.step('CL-UX-9: no request for the list is made', async () => {
      expect(listRequests).toEqual([])
    })
  })

  test('The list recovers from a failed load', async ({ page }) => {
    const account = newAccount('Member')
    await signIn(page, account)
    const campaignName = `Recover ${account.oid.slice(0, 6)}`
    await createCampaignViaUi(page, campaignName)

    let failing = true
    let releaseFirstRequest: () => void = () => {}
    const firstRequestHeld = new Promise<void>((resolve) => {
      releaseFirstRequest = resolve
    })
    await page.route('**/api/campaigns', async (route) => {
      if (route.request().method() !== 'GET' || !failing) {
        await route.continue()
        return
      }
      await firstRequestHeld
      await route.fulfill({ status: 500 })
    })

    await test.step('CL-UX-10: skeleton items show while loading', async () => {
      await page.goto('/campaigns')
      await expect(page.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeVisible()
      await expect(page.locator('[aria-busy="true"]')).toBeVisible()
    })

    await test.step('CL-UX-10: a failed load offers Try again', async () => {
      releaseFirstRequest()
      // TanStack Query retries a failed query three times before reporting the error.
      await expect(page.getByRole('alert')).toContainText("We couldn't load your campaigns.", { timeout: 20_000 })
    })

    await test.step('CL-UX-10: a successful retry shows the list and focuses the heading', async () => {
      failing = false
      await page.getByRole('alert').getByRole('button', { name: 'Try again' }).click()
      await expect(section(page, 'You run').getByRole('link', { name: campaignName, exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeFocused()
    })
  })
})
