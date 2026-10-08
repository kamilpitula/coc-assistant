import { test, expect } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import {
  chooseAntiquarianViaUi,
  chooseCreationMethod,
  chooseOption,
  fillPointBuy,
  joinAsNewPlayer,
  pickAntiquarianSkillsViaUi,
  pressWizardAction,
  spendAntiquarianPointsViaUi,
  VALID_POINT_BUY,
} from '../fixtures/investigators'
import { attentionList, memberRow, ownRow } from '../fixtures/overview'

/**
 * Traces to specs/campaign-play/spec.md "Investigator lifecycle" and Scenarios "Player starts a Draft Investigator",
 * "Player submits a valid Character Sheet", "Keeper requests changes", "Request changes requires a comment", and
 * "Keeper approves an Investigator"; to specs/character-sheet/spec.md Scenarios "Point Buy Investigator applies age
 * effects before Hard and Extreme values", "Draft resumes after leaving the wizard", "Standard Rolling records every
 * Player-entered roll", "Changing characteristics keeps later allocations", and "Changing the Creation Method clears
 * characteristics after confirmation"; and to specs/character-sheet/ux.md sections 3 to 7 (UX-3, UX-4, UX-5, UX-7,
 * UX-8, UX-9, UX-10, UX-11, UX-12, UX-13, UX-14, UX-15, UX-20), with the Campaign page as the overview of
 * specs/campaign-overview/ux.md (CO-UX-4, CO-UX-6, CO-UX-9).
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
    // A Point buy only Campaign also covers UX-10: the method is named, not offered as a choice.
    const campaignId = await createCampaignViaUi(page, campaignName, { allowedCreationMethods: ['Point buy'] })
    const token = await issueInviteViaUi(page, campaignId)
    const player = await joinAsNewPlayer(browser, token)
    const playerPage = player.page

    try {
      await test.step('UX-3: the Player creates a Draft from "Needs your attention"', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await expect(playerPage.getByRole('heading', { level: 1, name: campaignName })).toBeVisible()
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Identity' })).toBeFocused()
      })

      await test.step('UX-3: the Keeper sees the Draft only as "In progress", without a name or an action', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        const row = memberRow(page, player.account.name)
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
        await expect(attentionList(playerPage).getByText('Continue Harvey Walters: step 2 of 7')).toBeVisible()
      })

      await test.step('UX-5: "Continue" resumes at Characteristics with the saved value', async () => {
        await attentionList(playerPage).getByRole('link', { name: 'Continue' }).click()
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

      await test.step('the Player chooses the Antiquarian, picks its skills, and spends every point', async () => {
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await spendAntiquarianPointsViaUi(playerPage)
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
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step('UX-12: the Submitted Investigator opens read-only', async () => {
        await ownRow(playerPage).getByRole('link', { name: 'View Harvey Walters' }).click()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Harvey Walters' })).toBeVisible()
        await expect(playerPage.getByRole('textbox')).toHaveCount(0)
        await expect(playerPage.getByRole('spinbutton')).toHaveCount(0)
      })

      await test.step('UX-13: the Keeper is asked to review the Submitted Investigator', async () => {
        await page.reload()
        await attentionList(page).getByRole('link', { name: 'Review Harvey Walters' }).click()
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
        await expect(attentionList(playerPage).getByText('Credit Rating seems high for this Occupation')).toBeVisible()
        await attentionList(playerPage).getByRole('link', { name: 'Edit Investigator' }).click()
        await expect(playerPage.getByRole('heading', { name: 'Your Keeper asked for changes' })).toBeVisible()
        await playerPage.getByRole('link', { name: 'Change identity' }).click()
        await playerPage.getByLabel('Residence').fill('Arkham')
        await pressWizardAction(playerPage, 'Save and exit')
        await attentionList(playerPage).getByRole('link', { name: 'Edit Investigator' }).click()
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step('UX-14: the Keeper approves on one click and it is ready for play', async () => {
        await page.reload()
        await page.getByRole('button', { name: 'Approve' }).click()
        await expect(page.getByText('Harvey Walters is approved and ready for play.')).toBeFocused()
        await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)
      })

      await test.step('the Player sees the Investigator approved and ready for play', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await expect(ownRow(playerPage)).toContainText('Approved - ready for play')
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player creates a Standard rolling Investigator from Player-entered rolls, and lowering EDU flags the skill points', async ({
    page,
    browser,
  }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Rolling ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page

    try {
      await test.step('the Player names a 25-year-old Investigator', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Mae Doyle')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('UX-9: the Player chooses Standard rolling and enters raw dice totals', async () => {
        await chooseCreationMethod(playerPage, 'Standard rolling')
        for (const [code, dice, total] of STANDARD_ROLLS) {
          await playerPage.getByLabel(`${code}, ${dice} total`).fill(total)
        }
        await expect(playerPage.getByLabel('SIZ, 2D6 total')).toHaveValue('6')
        await playerPage.getByLabel('Luck, 3D6 total').fill('11')
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player makes the EDU check, then picks the Antiquarian and spends the points', async () => {
        await playerPage.getByRole('group', { name: 'EDU check 1 of 1' }).getByLabel('D100 roll').fill('30')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await spendAntiquarianPointsViaUi(playerPage)
      })

      await test.step('UX-7: lowering EDU keeps the allocations and marks Occupation skills as needing attention', async () => {
        await playerPage.getByRole('link', { name: /^Characteristics ?, completed$/ }).click()
        await playerPage.getByLabel('EDU, 2D6 total').fill('2')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('status').filter({ hasText: 'Some later steps need attention.' })).toBeVisible()
        await playerPage.getByRole('link', { name: /^Occupation skills ?, needs attention$/ }).click()
        await expect(playerPage.getByText("You've spent 200 occupation points. You have 160.")).toBeVisible()
        await expect(playerPage.getByLabel('Library Use, occupation points')).toHaveValue('50')
      })

      await test.step('the Player restores EDU and submits', async () => {
        await playerPage.getByRole('link', { name: /^Characteristics ?, completed$/ }).click()
        await playerPage.getByLabel('EDU, 2D6 total').fill('4')
        await pressWizardAction(playerPage, 'Save and continue')
        await playerPage.getByRole('link', { name: /^Sheet and submit ?, completed$/ }).click()
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step('the Keeper sees one Player-entered result per roll', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Mae Doyle' }).click()
        await page.getByRole('button', { name: 'Dice results' }).click()
        for (const [code, dice, total] of STANDARD_ROLLS) {
          await expect(page.getByRole('row', { name: new RegExp(`^${code} ${dice} ${total} Player$`) })).toBeVisible()
        }
        await expect(page.getByRole('row', { name: /^Luck 3D6 11 Player$/ })).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player creates a Quick fire Investigator after confirming the switch from Point buy', async ({ page, browser }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Quick fire ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page

    try {
      await test.step('the Player names a 25-year-old Investigator and starts with Point buy', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Dr. Ames')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Point buy')
        await playerPage.getByLabel('STR', { exact: true }).fill('60')
      })

      await test.step('UX-8: switching needs confirmation, and cancelling keeps the method and the values', async () => {
        await chooseCreationMethod(playerPage, 'Quick fire')
        const dialog = playerPage.getByRole('alertdialog', { name: 'Switch to Quick fire?' })
        await expect(dialog).toContainText('Your characteristic values will be cleared.')
        await dialog.getByRole('button', { name: 'Keep current method' }).click()
        await expect(playerPage.getByRole('radio', { name: 'Point buy' })).toBeChecked()
        await expect(playerPage.getByLabel('STR', { exact: true })).toHaveValue('60')
      })

      await test.step('UX-8: confirming switches to Quick fire and clears the values', async () => {
        await chooseCreationMethod(playerPage, 'Quick fire')
        await playerPage.getByRole('alertdialog').getByRole('button', { name: 'Switch and clear' }).click()
        await expect(playerPage.getByRole('radio', { name: 'Quick fire' })).toBeChecked()
        await expect(playerPage.getByText('Values left to assign: 80, 70, 60, 60, 50, 50, 50, 40')).toBeVisible()
      })

      await test.step('the Player assigns each Quick fire value once and rolls Luck', async () => {
        for (const [code, value] of QUICK_FIRE_CHARACTERISTICS) {
          await chooseOption(playerPage, code, value)
        }
        await expect(playerPage.getByText('Every value is assigned.')).toBeVisible()
        await playerPage.getByLabel('Luck, 3D6 total').fill('11')
        await pressWizardAction(playerPage, 'Save and continue')
        await playerPage.getByRole('group', { name: 'EDU check 1 of 1' }).getByLabel('D100 roll').fill('30')
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player assigns the skill values, with Credit Rating at its value and the freed 40 to one more skill', async () => {
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await expect(playerPage.getByText('Must be 30 for this occupation')).toBeVisible()
        for (const [skill, value] of QUICK_FIRE_SKILLS) {
          await chooseOption(playerPage, `${skill}, Quick fire value`, value)
        }
        await chooseOption(playerPage, 'Extra skill for the freed 40', 'Drive Auto')
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player chooses four personal interests and submits', async () => {
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Personal interests' })).toBeVisible()
        for (const skill of ['Listen', 'Stealth', 'Psychology', 'Persuade']) {
          await playerPage.getByRole('checkbox', { name: `${skill}, +20` }).check()
        }
        await expect(playerPage.getByText('Personal interests chosen: 4 of 4')).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
        await expect(playerPage.getByRole('row', { name: /^Listen/ })).toContainText('40')
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })
    } finally {
      await player.context.close()
    }
  })
})

/** Raw totals for STR 60, CON 60, DEX 60, APP 50, POW 60, SIZ 60, INT 60, EDU 50 (section 2.1). */
const STANDARD_ROLLS: [code: string, dice: string, total: string][] = [
  ['STR', '3D6', '12'],
  ['CON', '3D6', '12'],
  ['DEX', '3D6', '12'],
  ['APP', '3D6', '10'],
  ['POW', '3D6', '12'],
  ['SIZ', '2D6', '6'],
  ['INT', '2D6', '6'],
  ['EDU', '2D6', '4'],
]

/** One of each section 2.3 pool value. */
const QUICK_FIRE_CHARACTERISTICS: [code: string, value: string][] = [
  ['STR', '50'],
  ['CON', '60'],
  ['DEX', '50'],
  ['APP', '40'],
  ['POW', '60'],
  ['SIZ', '50'],
  ['INT', '80'],
  ['EDU', '70'],
]

/** The Antiquarian's Credit Rating (minimum 30) and occupation skills with one of each section 18 value but the freed 40. */
const QUICK_FIRE_SKILLS: [skill: string, value: string][] = [
  ['Credit Rating', '30'],
  ['Appraise', '70'],
  ['Art/Craft (Painting)', '60'],
  ['History', '60'],
  ['Library Use', '50'],
  ['Language (Other): Latin', '50'],
  ['Charm', '50'],
  ['Spot Hidden', '40'],
  ['Firearms (Handgun)', '40'],
]
