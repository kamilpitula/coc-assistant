import { test, expect } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { fillPointBuy, joinAsNewPlayer, pressWizardAction, VALID_POINT_BUY } from '../fixtures/investigators'

/**
 * Traces to specs/campaign-play/spec.md "Investigator lifecycle" and Scenarios "Player starts a Draft Investigator",
 * "Player submits a valid Character Sheet", "Keeper requests changes", "Request changes requires a comment", and
 * "Keeper approves an Investigator"; to specs/character-sheet/spec.md Scenarios "Point Buy Investigator applies age
 * effects before Hard and Extreme values" and "Draft resumes after leaving the wizard"; and to
 * specs/character-sheet/ux.md sections 3 to 7 (UX-3, UX-4, UX-5, UX-11, UX-12, UX-13, UX-14, UX-15, UX-20).
 */
test.describe('Investigator lifecycle', () => {
  test('A Player creates, saves, resumes, and submits an Investigator; the Keeper requests changes, then approves it', async ({
    page,
    browser,
  }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignName = `Lifecycle ${keeper.oid.slice(0, 6)}`
    const campaignId = await createCampaignViaUi(page, campaignName)
    const token = await issueInviteViaUi(page, campaignId)
    const player = await joinAsNewPlayer(browser, token)
    const playerPage = player.page

    try {
      await test.step('UX-3: the Player creates a Draft from the Your Investigator card', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await expect(playerPage.getByRole('heading', { level: 1, name: campaignName })).toBeVisible()
        await playerPage.getByRole('button', { name: 'Create Investigator' }).click()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Identity' })).toBeFocused()
      })

      await test.step('UX-3: the Keeper sees the Draft only as "In progress", without a name or an action', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        const investigators = page.getByRole('region', { name: 'Investigators' })
        const row = investigators.getByRole('row', { name: new RegExp(player.account.name) })
        await expect(row.getByText('In progress')).toBeVisible()
        await expect(row.getByText('Not shown until submitted')).toBeVisible()
        await expect(row.getByRole('link')).toHaveCount(0)
      })

      await test.step('UX-4: "Save and continue" with errors stays on the step and shows the error summary', async () => {
        await pressWizardAction(playerPage, 'Save and continue')
        const summary = playerPage.getByRole('alert').filter({ hasText: "There's a problem" })
        await expect(summary.getByRole('link', { name: "Enter your Investigator's name." })).toBeVisible()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Identity' })).toBeVisible()
      })

      await test.step('the Player completes Identity and moves on to Characteristics', async () => {
        await playerPage.getByLabel('Investigator name').fill('Harvey Walters')
        await playerPage.getByLabel('Age').fill('45')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Characteristics' })).toBeVisible()
        await expect(playerPage.getByText('Creation method: Point buy')).toBeVisible()
      })

      await test.step('UX-5: "Save and exit" keeps a partial Draft and returns with "Draft saved."', async () => {
        await playerPage.getByLabel('STR', { exact: true }).fill('60')
        await pressWizardAction(playerPage, 'Save and exit')
        await expect(playerPage.getByRole('status').filter({ hasText: 'Draft saved.' })).toBeVisible()
        await expect(playerPage.getByText('Step 2 of 4')).toBeVisible()
      })

      await test.step('UX-5: "Continue" resumes at Characteristics with the saved value', async () => {
        await playerPage.getByRole('link', { name: 'Continue' }).click()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Characteristics' })).toBeVisible()
        await expect(playerPage.getByLabel('STR', { exact: true })).toHaveValue('60')
      })

      await test.step('UX-20: the Player buys characteristics and rolls Luck outside the points', async () => {
        await fillPointBuy(playerPage, VALID_POINT_BUY)
        await expect(playerPage.getByText('Points used: 460 of 460')).toBeVisible()
        await playerPage.getByLabel('Luck, 3D6 total').fill('11')
        await expect(playerPage.getByText('= 55')).toBeVisible()
        await expect(playerPage.getByText('Points used: 460 of 460')).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player applies the age effects for 45', async () => {
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Age effects' })).toBeVisible()
        await expect(
          playerPage.getByText('At age 45 you lose 5 points from STR, CON or DEX, APP is reduced by 5, and you make 2 EDU checks.'),
        ).toBeVisible()
        await playerPage.getByLabel('Deduct from STR').fill('3')
        await playerPage.getByLabel('Deduct from DEX').fill('2')
        await expect(playerPage.getByText('Still to deduct: 0')).toBeVisible()
        await playerPage.getByRole('group', { name: 'EDU check 1 of 2' }).getByLabel('D100 roll').fill('30')
        await playerPage.getByRole('group', { name: 'EDU check 2 of 2' }).getByLabel('D100 roll').fill('20')
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the summary shows values after age effects with Hard and Extreme values', async () => {
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
        const strength = playerPage.getByRole('row', { name: /^STR/ })
        await expect(strength.getByRole('cell')).toHaveText(['60', '57', '28', '11'])
      })

      await test.step('UX-11: submitting returns to the Campaign page with the Submitted badge', async () => {
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(
          playerPage.getByRole('status').filter({ hasText: 'Submitted. Your Keeper will review your Investigator.' }),
        ).toBeVisible()
        await expect(playerPage.getByText('Submitted - waiting for your Keeper')).toBeVisible()
      })

      await test.step('UX-12: the Submitted Investigator opens read-only', async () => {
        await playerPage.getByRole('link', { name: 'View' }).click()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Harvey Walters' })).toBeVisible()
        await expect(playerPage.getByRole('textbox')).toHaveCount(0)
        await expect(playerPage.getByRole('spinbutton')).toHaveCount(0)
      })

      await test.step('UX-13: the Keeper sees the Submitted Investigator first, with "Review"', async () => {
        await page.reload()
        const investigators = page.getByRole('region', { name: 'Investigators' })
        await investigators.getByRole('link', { name: 'Review Harvey Walters' }).click()
        await expect(page.getByRole('heading', { level: 1, name: 'Harvey Walters' })).toBeVisible()
        await expect(page.getByText(`Player: ${player.account.name}`)).toBeVisible()
      })

      await test.step('the Keeper sees the dice results the Player entered', async () => {
        await page.getByRole('button', { name: 'Dice results' }).click()
        await expect(page.getByRole('row', { name: /^Luck 3D6 11 Player$/ })).toBeVisible()
      })

      await test.step('UX-15: a Change Request needs a comment, then goes to the Player', async () => {
        await page.getByRole('button', { name: 'Request changes' }).click()
        const dialog = page.getByRole('dialog', { name: 'Request changes' })
        await dialog.getByRole('button', { name: 'Send to Player' }).click()
        await expect(dialog.getByText('Write what the Player should change.')).toBeVisible()
        await dialog.getByLabel('What should the Player change?').fill('Credit Rating seems high for this Occupation')
        await dialog.getByRole('button', { name: 'Send to Player' }).click()
        await expect(page.getByRole('status').filter({ hasText: 'Sent to the Player.' })).toBeVisible()
        await expect(page.getByText('Changes requested')).toBeVisible()
      })

      await test.step("UX-15: the Player sees the Keeper's comment, edits, and resubmits", async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await expect(playerPage.getByText('Credit Rating seems high for this Occupation')).toBeVisible()
        await playerPage.getByRole('link', { name: 'Edit Investigator' }).click()
        await expect(playerPage.getByRole('heading', { name: 'Your Keeper asked for changes' })).toBeVisible()
        await playerPage.getByRole('link', { name: 'Change identity' }).click()
        await playerPage.getByLabel('Residence').fill('Arkham')
        await pressWizardAction(playerPage, 'Save and exit')
        await playerPage.getByRole('link', { name: 'Edit Investigator' }).click()
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(playerPage.getByText('Submitted - waiting for your Keeper')).toBeVisible()
      })

      await test.step('UX-14: the Keeper approves on one click and it is ready for play', async () => {
        await page.reload()
        await page.getByRole('button', { name: 'Approve' }).click()
        await expect(page.getByText('Harvey Walters is approved and ready for play.')).toBeFocused()
        await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)
      })

      await test.step('the Player sees the Investigator approved and ready for play', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await expect(playerPage.getByText('Approved - ready for play')).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })
})
