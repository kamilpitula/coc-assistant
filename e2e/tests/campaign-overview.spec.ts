import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import {
  API_ORIGIN,
  approveFromOverview,
  joinAsNewPlayer,
  openAndCaptureBearer,
  pressWizardAction,
  chooseAntiquarianViaUi,
  pickAntiquarianSkillsViaUi,
  saveDraftUpToAgeEffectsViaUi,
  spendAntiquarianPointsViaUi,
  submitValidInvestigatorViaUi,
} from '../fixtures/investigators'
import { attentionList, atTheTable, campaignNav, memberRow, memberRows, ownRow } from '../fixtures/overview'

/**
 * Traces to specs/campaign-overview/spec.md Scenarios and specs/campaign-overview/ux.md section 11:
 * - "Opening a Campaign lands on the overview" (CO-UX-1, CO-UX-2)
 * - "Players do not see Settings" (CO-UX-2, CO-UX-12)
 * - "Settings holds Invite management and Rules options" (CO-UX-3)
 * - "Keeper is asked to review a submitted Investigator" (CO-UX-4), with the header on the review page (CO-UX-11)
 * - "Keeper without Players is prompted to invite" (CO-UX-5, CO-UX-10)
 * - "Player attention follows their Investigator" (CO-UX-6)
 * - "Player sees the Keeper's Change Request on the overview" (CO-UX-6)
 * - "Players see only Approved Investigators of others" (CO-UX-7, CO-UX-8)
 * - "Keeper does not see Draft names" (CO-UX-9)
 * - "Header stays on Campaign sub-pages" (CO-UX-11)
 * "Roster API projects Investigators by caller" is API-level and covered by
 * backend/tests/CocAssistant.Api.IntegrationTests (CampaignMembersApiTests). "Approval reaches other Players without
 * reloading" (CO-UX-13) needs the PBI-CP-006 topics and ships with it.
 */

function navLink(page: Page, name: 'Overview' | 'Settings') {
  return campaignNav(page).getByRole('link', { name, exact: true })
}

test.describe('Campaign overview and navigation', () => {
  test('Opening a Campaign lands on the overview with the Campaign header', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignName = `Overview ${keeper.oid.slice(0, 6)}`
    const campaignId = await createCampaignViaUi(page, campaignName)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await page.goto(`/campaigns/${campaignId}`)

      await test.step('CO-UX-1: the page heading is the Campaign name, under a back link and above the Era', async () => {
        await expect(page.getByRole('heading', { level: 1, name: campaignName })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute('href', '/campaigns')
        await expect(page.getByText('1920s', { exact: true })).toBeVisible()
      })

      await test.step('CO-UX-2: the Campaign navigation shows "Overview" as current and "Settings"', async () => {
        await expect(campaignNav(page).getByRole('link')).toHaveText(['Overview', 'Settings'])
        await expect(navLink(page, 'Overview')).toHaveAttribute('aria-current', 'page')
        await expect(navLink(page, 'Settings')).not.toHaveAttribute('aria-current', 'page')
      })

      await test.step('the Keeper moves to Settings and back with the navigation', async () => {
        await navLink(page, 'Settings').click()
        await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
        await expect(navLink(page, 'Settings')).toHaveAttribute('aria-current', 'page')
        await navLink(page, 'Overview').click()
        await expect(page.getByRole('heading', { level: 1, name: campaignName })).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('Players do not see Settings and cannot open it', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `No settings ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await test.step('CO-UX-2: the Player\'s Campaign navigation shows only "Overview"', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(campaignNav(player.page).getByRole('link')).toHaveText(['Overview'])
      })

      await test.step('CO-UX-12: opening the Settings address shows that the page could not be found', async () => {
        await player.page.goto(`/campaigns/${campaignId}/settings`)
        await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that page" })).toBeVisible()
        await expect(player.page.getByRole('heading', { name: 'Invite', exact: true })).toHaveCount(0)
        await expect(player.page.getByRole('heading', { name: 'Rules options' })).toHaveCount(0)
        await expect(player.page.getByLabel(/share this join link/i)).toHaveCount(0)
      })

      await test.step('"Back to overview" returns the Player to the overview', async () => {
        await player.page.getByRole('link', { name: 'Back to overview' }).click()
        await expect(atTheTable(player.page)).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('Settings holds Invite management and Rules options, and the overview has neither', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Settings ${keeper.oid.slice(0, 6)}`)
    const firstToken = await issueInviteViaUi(page, campaignId)

    await test.step('CO-UX-3: the overview shows no join link field and no Rules options', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(atTheTable(page)).toBeVisible()
      await expect(page.getByLabel(/share this join link/i)).toHaveCount(0)
      await expect(page.getByRole('region', { name: 'Rules options' })).toHaveCount(0)
    })

    await test.step('CO-UX-3: on Settings the Keeper can replace the Invite', async () => {
      await navLink(page, 'Settings').click()
      const invite = page.getByRole('region', { name: 'Invite' })
      await invite.getByRole('button', { name: 'Replace link' }).click()
      await expect(invite.getByLabel(/share this join link/i)).not.toHaveValue(new RegExp(`/campaigns/join/${firstToken}$`))
    })

    await test.step('CO-UX-3: on Settings the Keeper can revoke the Invite', async () => {
      const invite = page.getByRole('region', { name: 'Invite' })
      await invite.getByRole('button', { name: 'Revoke link' }).click()
      await expect(invite.getByText('This Campaign has no active Invite. Issue one to let Players join.')).toBeVisible()
    })

    await test.step('CO-UX-3: on Settings the Keeper can edit the Creation Methods', async () => {
      const rulesOptions = page.getByRole('region', { name: 'Rules options' })
      await rulesOptions.getByRole('button', { name: 'Edit creation methods' }).click()
      await expect(page.getByRole('dialog', { name: 'Edit creation methods' })).toBeVisible()
    })
  })

  test('Keeper is asked to review a submitted Investigator', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Review ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await submitValidInvestigatorViaUi(player.page, campaignId, 'Dr. Ames')

      await test.step('CO-UX-4: "Needs your attention" shows the Investigator ready for review', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await expect(attentionList(page).getByRole('listitem')).toHaveText([
          new RegExp(`Dr\\. Ames by ${player.account.name} is ready for review`),
        ])
        await expect(memberRow(page, player.account.name)).toContainText('Submitted')
      })

      await test.step('CO-UX-4: choosing "Review" opens the review screen, under the Campaign header', async () => {
        await attentionList(page).getByRole('link', { name: 'Review Dr. Ames' }).click()
        await expect(page.getByRole('heading', { level: 1, name: 'Dr. Ames' })).toBeVisible()
        await expect(navLink(page, 'Overview')).toHaveAttribute('aria-current', 'page')
      })
    } finally {
      await player.context.close()
    }
  })

  test('Keeper without Players invites them with the join link', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const campaignId = await createCampaignViaUi(page, `Invite ${keeper.oid.slice(0, 6)}`)
    await page.goto(`/campaigns/${campaignId}`)
    const invitePlayers = attentionList(page).getByRole('button', { name: 'Invite Players' })
    const dialog = page.getByRole('dialog', { name: 'Invite Players' })
    let token = ''

    await test.step('CO-UX-5: "Needs your attention" says no Players have joined yet', async () => {
      await expect(attentionList(page).getByText('No Players have joined yet.')).toBeVisible()
    })

    await test.step('CO-UX-10: "Invite Players" creates a join link and shows it in the dialog', async () => {
      await invitePlayers.click()
      const joinLink = dialog.getByLabel('Join link')
      await expect(joinLink).toHaveValue(/\/campaigns\/join\/.+$/)
      token = (await joinLink.inputValue()).split('/campaigns/join/')[1]
    })

    await test.step('CO-UX-10: "Copy link" copies it and shows "Copied."', async () => {
      await dialog.getByRole('button', { name: 'Copy link' }).click()
      await expect(dialog.getByRole('status')).toHaveText('Copied.')
      expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/campaigns/join/${token}$`))
    })

    await test.step('"Done" closes the dialog and returns focus to "Invite Players"', async () => {
      await dialog.getByRole('button', { name: 'Done' }).click()
      await expect(dialog).toHaveCount(0)
      await expect(invitePlayers).toBeFocused()
    })

    const player = await joinAsNewPlayer(browser, token)
    try {
      await test.step('CO-UX-5: once a Player joins, the item disappears without a reload', async () => {
        await expect(memberRow(page, player.account.name)).toBeVisible()
        await expect(attentionList(page)).toHaveCount(0)
      })
    } finally {
      await player.context.close()
    }
  })

  test('Player attention follows their Investigator from Draft to Submitted', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Attention ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await test.step('CO-UX-6: a Player without an Investigator is asked to create one', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(attentionList(player.page).getByRole('listitem')).toHaveText([
          /Create the Investigator you'll play in this Campaign\./,
        ])
      })

      await test.step('CO-UX-6: a Draft at step 3 shows one item with "step 3 of 7" and "Continue"', async () => {
        await saveDraftUpToAgeEffectsViaUi(player.page, campaignId, 'Mae Doyle')
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(attentionList(player.page).getByRole('listitem')).toHaveText([/Continue Mae Doyle: step 3 of 7/])
        await expect(ownRow(player.page)).toContainText('Draft')
      })

      await test.step('the Player continues and submits the Investigator', async () => {
        await attentionList(player.page).getByRole('link', { name: 'Continue' }).click()
        await expect(player.page.getByRole('heading', { level: 1, name: 'Age effects' })).toBeVisible()
        await player.page.getByRole('group', { name: 'EDU check 1 of 1' }).getByLabel('D100 roll').fill('30')
        await pressWizardAction(player.page, 'Save and continue')
        await chooseAntiquarianViaUi(player.page)
        await pickAntiquarianSkillsViaUi(player.page)
        await spendAntiquarianPointsViaUi(player.page)
        await player.page.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(player.page)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step('CO-UX-6: once Submitted, "Needs your attention" is not shown', async () => {
        await expect(attentionList(player.page)).toHaveCount(0)
      })
    } finally {
      await player.context.close()
    }
  })

  test("Player sees the Keeper's Change Request on the overview", async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Changes ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await submitValidInvestigatorViaUi(player.page, campaignId, 'Mae Doyle')

      await test.step('the Keeper requests changes with a comment', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Mae Doyle' }).click()
        await page.getByRole('button', { name: 'Request changes' }).click()
        const dialog = page.getByRole('dialog', { name: 'Request changes' })
        await dialog.getByLabel('What should the Player change?').fill('Lower the Credit Rating.')
        await dialog.getByRole('button', { name: 'Send to Player' }).click()
        await expect(page.getByRole('status').filter({ hasText: 'Sent to the Player.' })).toBeVisible()
      })

      await test.step('CO-UX-6: "Needs your attention" shows the comment and "Edit Investigator"', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        const attention = attentionList(player.page)
        await expect(attention.getByText('Your Keeper asked for changes to Mae Doyle.')).toBeVisible()
        await expect(attention.getByText('Lower the Credit Rating.')).toBeVisible()
        await attention.getByRole('link', { name: 'Edit Investigator' }).click()
        await expect(player.page).toHaveURL(new RegExp(`/campaigns/${campaignId}/investigator/sheet$`))
      })
    } finally {
      await player.context.close()
    }
  })

  test('Players see only the Approved Investigators of other Players', async ({ page, browser }) => {
    test.slow()
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Party ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)
    const ana = await joinAsNewPlayer(browser, token, 'Ana')
    const ben = await joinAsNewPlayer(browser, token, 'Ben')
    const cleo = await joinAsNewPlayer(browser, token, 'Cleo')

    try {
      await test.step("Player A's Investigator is Approved and Player B's is Submitted", async () => {
        await submitValidInvestigatorViaUi(ana.page, campaignId, 'Mae Doyle')
        await approveFromOverview(page, campaignId, 'Mae Doyle')
        await submitValidInvestigatorViaUi(ben.page, campaignId, 'Dr. Ames')
      })

      await test.step('CO-UX-7: Player C sees every member once, in the fixed order', async () => {
        await cleo.page.goto(`/campaigns/${campaignId}`)
        await expect(memberRows(cleo.page)).toHaveText([
          new RegExp(`^${keeper.name}`),
          new RegExp(`^${cleo.account.name} \\(you\\)`),
          new RegExp(`^${ana.account.name}`),
          new RegExp(`^${ben.account.name}`),
        ])
        await expect(ownRow(cleo.page)).toContainText('No Investigator yet')
      })

      await test.step('CO-UX-8: Player A\'s row shows "Mae Doyle" and "Approved" with no link', async () => {
        const anaRow = memberRow(cleo.page, ana.account.name)
        await expect(anaRow).toContainText('Mae Doyle')
        await expect(anaRow).toContainText('Approved')
        await expect(anaRow.getByRole('link')).toHaveCount(0)
      })

      await test.step('CO-UX-8: Player B\'s row shows "Not ready yet"', async () => {
        const benRow = memberRow(cleo.page, ben.account.name)
        await expect(benRow).toContainText('Not ready yet')
        await expect(benRow).not.toContainText('Dr. Ames')
        await expect(benRow).not.toContainText('Submitted')
      })

      await test.step("the roster Player C receives carries no other Player's Investigator id", async () => {
        const bearer = await openAndCaptureBearer(cleo.page, `/campaigns/${campaignId}`)
        const response = await cleo.page.request.get(`${API_ORIGIN}/api/campaigns/${campaignId}/members`, {
          headers: { Authorization: bearer },
        })
        expect(response.status()).toBe(200)
        const roster = (await response.json()) as Array<{ investigator: Record<string, unknown> | null }>
        expect(roster.map((member) => member.investigator)).toEqual([
          null,
          null,
          { visibility: 'Visible', name: 'Mae Doyle', status: 'Approved' },
          { visibility: 'NotReady' },
        ])
      })
    } finally {
      await ana.context.close()
      await ben.context.close()
      await cleo.context.close()
    }
  })

  test('Keeper does not see Draft names', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Drafts ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await saveDraftUpToAgeEffectsViaUi(player.page, campaignId, 'Secret Name')

      await test.step('CO-UX-9: the Player\'s row shows "Not shown until submitted" and "In progress"', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        const row = memberRow(page, player.account.name)
        await expect(row).toContainText('Not shown until submitted')
        await expect(row).toContainText('In progress')
        await expect(row.getByRole('link')).toHaveCount(0)
        await expect(atTheTable(page)).not.toContainText('Secret Name')
      })
    } finally {
      await player.context.close()
    }
  })

  test('The Campaign header stays on Campaign sub-pages', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignName = `Sub-pages ${keeper.oid.slice(0, 6)}`
    const campaignId = await createCampaignViaUi(page, campaignName)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))

    try {
      await test.step('CO-UX-11: on the wizard the header shows the Campaign name and "Overview" as current', async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await attentionList(player.page).getByRole('button', { name: 'Create Investigator' }).click()
        await expect(player.page.getByRole('heading', { level: 1, name: 'Identity' })).toBeVisible()
        await expect(player.page.getByText(campaignName, { exact: true })).toBeVisible()
        await expect(player.page.getByRole('heading', { name: campaignName })).toHaveCount(0)
        await expect(navLink(player.page, 'Overview')).toHaveAttribute('aria-current', 'page')
      })
    } finally {
      await player.context.close()
    }
  })

  test('Someone who is not a member gets no Campaign header', async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Private ${keeper.oid.slice(0, 6)}`)
    const stranger = await signInNewContext(browser, newAccount('Stranger'))

    try {
      await stranger.page.goto(`/campaigns/${campaignId}/settings`)
      await expect(stranger.page.getByRole('heading', { level: 1, name: "We couldn't find that Campaign" })).toBeVisible()
      await expect(campaignNav(stranger.page)).toHaveCount(0)
    } finally {
      await stranger.context.close()
    }
  })
})
