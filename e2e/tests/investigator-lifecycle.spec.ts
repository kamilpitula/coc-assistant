import { test, expect, type Locator, type Page } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import {
  API_ORIGIN,
  chooseAntiquarianViaUi,
  chooseCreationMethod,
  chooseOption,
  fillPointBuy,
  joinAsNewPlayer,
  openAndCaptureBearer,
  pickAntiquarianSkillsViaUi,
  pressWizardAction,
  rollCharacteristicsViaUi,
  rollEduCheckViaUi,
  rollLuckViaUi,
  saveDraftUpToAgeEffectsViaUi,
  spendAntiquarianPointsViaUi,
  VALID_POINT_BUY,
} from '../fixtures/investigators'
import { attentionList, memberRow, ownRow } from '../fixtures/overview'

/**
 * Traces to specs/campaign-play/spec.md "Investigator lifecycle" and Scenarios "Player starts a Draft Investigator",
 * "Player submits a valid Character Sheet", "Keeper requests changes", "Request changes requires a comment", and
 * "Keeper approves an Investigator"; to specs/character-sheet/spec.md Scenarios "Point Buy Investigator applies age
 * effects before Hard and Extreme values", "Draft resumes after leaving the wizard", "Standard Rolling characteristics
 * are rolled by the server", "Characteristics are rolled only once", "Rolled characteristics lock the Creation Method",
 * "Changing characteristics keeps later allocations", "Changing the Creation Method clears characteristics after
 * confirmation", "Unspent personal interest points only warn", and "Keeper grants a characteristics re-roll"; and to
 * specs/character-sheet/ux.md sections 3 to 7 (UX-3, UX-4, UX-5, UX-7, UX-8, UX-10, UX-11, UX-12, UX-13, UX-14, UX-15,
 * UX-22, UX-23, UX-24, UX-25, UX-26, UX-27, UX-28, UX-29, UX-30, UX-31, UX-32, UX-34, UX-35, UX-36, UX-37, UX-38, UX-39,
 * UX-40; UX-33 has no API to create its legacy state and is covered by storage and integration tests), with the
 * Campaign page as the overview of specs/campaign-overview/ux.md (CO-UX-4, CO-UX-6, CO-UX-9).
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

      await test.step('UX-36: the Player buys characteristics and the app rolls Luck outside the points', async () => {
        await fillPointBuy(playerPage, VALID_POINT_BUY)
        await expect(playerPage.getByText('Points used: 460 of 460')).toBeVisible()
        await rollLuckViaUi(playerPage)
        await expect(playerPage.getByText(/^Luck \d+$/)).toBeVisible()
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
        await rollEduCheckViaUi(playerPage, 1)
        await rollEduCheckViaUi(playerPage, 2)
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player chooses the Antiquarian, picks its skills, and spends every point', async () => {
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await spendAntiquarianPointsViaUi(playerPage)
      })

      await test.step('UX-7: lowering INT keeps the allocations and marks Personal interests as needing attention', async () => {
        await playerPage.getByRole('link', { name: /^Characteristics ?, completed$/ }).click()
        await playerPage.getByLabel('INT', { exact: true }).fill('40')
        await playerPage.getByLabel('APP', { exact: true }).fill('70')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('status').filter({ hasText: 'Some later steps need attention.' })).toBeVisible()
        await playerPage.getByRole('link', { name: /^Personal interests ?, needs attention$/ }).click()
        await expect(playerPage.getByText('40 over budget')).toBeVisible()
        await expect(playerPage.getByLabel('Drive Auto, personal interest points')).toHaveValue('60')
      })

      await test.step('the Player restores INT and APP and returns to the summary', async () => {
        await playerPage.getByRole('link', { name: /^Characteristics ?, completed$/ }).click()
        await playerPage.getByLabel('INT', { exact: true }).fill('60')
        await playerPage.getByLabel('APP', { exact: true }).fill('50')
        await pressWizardAction(playerPage, 'Save and continue')
        await playerPage.getByRole('link', { name: /^Sheet and submit ?, completed$/ }).click()
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

      await test.step("the Keeper sees the server-rolled Luck with its faces", async () => {
        await page.getByRole('button', { name: 'Dice results' }).click()
        await expect(
          page.getByRole('row', {
            name: new RegExp(`^Luck 3D6 [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
          }),
        ).toBeVisible()
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

  test('A Player records the Backstory, Key Connection, a Custom Weapon, and Gear and submits despite unspent points; the Keeper reviews them', async ({
    page,
    browser,
  }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Backstory ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    const unspentWarning = 'You have 60 personal interest points left. Unspent points are lost.'

    try {
      await test.step('the Player creates a 25-year-old Antiquarian and spends every point', async () => {
        await saveDraftUpToAgeEffectsViaUi(playerPage, campaignId, 'Ida Marsh')
        await rollEduCheckViaUi(playerPage, 1)
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await spendAntiquarianPointsViaUi(playerPage)
      })

      await test.step('the Player leaves 60 personal interest points unspent', async () => {
        await playerPage.getByRole('link', { name: /^Personal interests ?, completed$/ }).click()
        await playerPage.getByLabel('Listen, personal interest points').fill('')
        await expect(playerPage.getByText('Personal interest points left: 60 of 120')).toBeVisible()
        await playerPage.getByRole('link', { name: /^Sheet and submit ?, completed$/ }).click()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
      })

      await test.step('UX-29: "Worth checking" on Sheet and submit lists the unspent points warning', async () => {
        await expect(playerPage.getByRole('heading', { name: 'Worth checking' })).toBeVisible()
        await expect(playerPage.getByRole('listitem').filter({ hasText: unspentWarning })).toBeVisible()
      })

      await test.step('UX-27: the Player records My Story, a Background entry as the Key Connection, and Gear', async () => {
        await playerPage.getByRole('textbox', { name: 'My story' }).fill('Grew up above a bookshop in Arkham.')
        await playerPage.getByRole('textbox', { name: 'Significant people' }).fill('My sister Ada')
        const keyConnection = playerPage.getByRole('radiogroup', { name: 'Which of these is your Key Connection?' })
        await keyConnection.getByRole('radio', { name: 'Significant people' }).click()
        await playerPage.getByRole('textbox', { name: 'Gear and possessions' }).fill('Camera, notebook, lantern')
      })

      await test.step('UX-11: a weapon without a name blocks submission, and its error link focuses the name', async () => {
        await playerPage.getByRole('button', { name: 'Add weapon' }).click()
        await expect(playerPage.getByLabel('Weapon 1 name')).toBeFocused()
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        const summary = playerPage.getByRole('alert').filter({ hasText: "There's a problem" })
        await summary.getByRole('link', { name: 'Enter a name for this weapon.' }).click()
        await expect(playerPage.getByLabel('Weapon 1 name')).toBeFocused()
      })

      await test.step('UX-27: the Player names the Custom Weapon and submits with the warning', async () => {
        await playerPage.getByLabel('Weapon 1 name').fill('.38 Revolver')
        await playerPage.getByLabel('Weapon 1 skill').fill('Firearms (Handgun)')
        await playerPage.getByLabel('Weapon 1 damage').fill('1D10')
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step("UX-28: the Player's View shows the Backstory, weapon, Gear, and Wealth read-only", async () => {
        await ownRow(playerPage).getByRole('link', { name: 'View Ida Marsh' }).click()
        await expect(playerPage.getByRole('heading', { level: 3, name: 'Significant people (Key Connection)' })).toBeVisible()
        await expect(playerPage.getByRole('table', { name: 'Weapons' }).getByRole('row', { name: /\.38 Revolver/ })).toBeVisible()
        await expect(playerPage.getByText('Camera, notebook, lantern')).toBeVisible()
        await expect(playerPage.getByRole('heading', { level: 2, name: 'Wealth' })).toBeVisible()
        await expect(playerPage.getByRole('textbox')).toHaveCount(0)
      })

      await test.step('UX-30: the Keeper sees the warning and the custom weapon under "Worth checking", the sheet, and the dice results', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Ida Marsh' }).click()
        await expect(page.getByRole('heading', { name: 'Worth checking' })).toBeVisible()
        await expect(page.getByRole('listitem').filter({ hasText: unspentWarning })).toBeVisible()
        await expect(page.getByRole('listitem').filter({ hasText: '1 custom weapon' })).toBeVisible()
        await expect(page.getByText('Grew up above a bookshop in Arkham.')).toBeVisible()
        await expect(page.getByRole('heading', { level: 3, name: 'Significant people (Key Connection)' })).toBeVisible()
        await expect(page.getByRole('table', { name: 'Weapons' }).getByRole('row', { name: /\.38 Revolver/ })).toBeVisible()
        await expect(page.getByRole('textbox')).toHaveCount(0)
        await page.getByRole('button', { name: 'Dice results' }).click()
        await expect(
          page.getByRole('row', {
            name: new RegExp(`^Luck 3D6 [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
          }),
        ).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('A Player rolls Standard rolling characteristics on the server; the roll happens once and locks the Creation Method', async ({
    page,
    browser,
  }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Rolling ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    const bearer = await openAndCaptureBearer(playerPage, `/campaigns/${campaignId}`)
    let rolledValues: string[] = []

    try {
      await test.step('the Player names a 25-year-old Investigator', async () => {
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Mae Doyle')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('UX-31: the Player chooses Standard rolling and sees no characteristic inputs', async () => {
        await chooseCreationMethod(playerPage, 'Standard rolling')
        await expect(playerPage.getByText('The app rolls each characteristic for you:')).toBeVisible()
        await expect(playerPage.getByRole('button', { name: 'Roll characteristics' })).toBeVisible()
        await expect(playerPage.getByLabel('STR', { exact: true })).toHaveCount(0)
      })

      await test.step('"Not yet" closes the dialog and nothing is rolled', async () => {
        await playerPage.getByRole('button', { name: 'Roll characteristics' }).click()
        const dialog = playerPage.getByRole('alertdialog', { name: 'Roll characteristics?' })
        await expect(dialog).toBeVisible()
        await dialog.getByRole('button', { name: 'Not yet' }).click()
        await expect(playerPage.getByRole('button', { name: 'Roll characteristics' })).toBeVisible()
        await expect(playerPage.getByRole('heading', { name: 'Your characteristics' })).toHaveCount(0)
      })

      await test.step('UX-34: "Roll now" shows the eight values, announces the roll, and the action is gone', async () => {
        await rollCharacteristicsViaUi(playerPage)
        await expect(playerPage.getByRole('status').filter({ hasText: 'Characteristics rolled.' })).toBeVisible()
        await expect(playerPage.getByRole('button', { name: 'Roll characteristics' })).toHaveCount(0)
        rolledValues = (await characteristicValueItems(playerPage).allTextContents()).map(normalizeValueItem)
        expect(rolledValues).toHaveLength(8)
      })

      await test.step('a second roll is refused and a reload shows the same eight values', async () => {
        const second = await playerPage.request.post(rollCharacteristicsUrl(campaignId), {
          headers: { Authorization: bearer },
        })
        expect(second.status()).toBe(409)
        await playerPage.reload()
        await expect(playerPage.getByRole('heading', { name: 'Your characteristics' })).toBeVisible()
        const reloaded = (await characteristicValueItems(playerPage).allTextContents()).map(normalizeValueItem)
        expect(reloaded).toEqual(rolledValues)
      })

      await test.step('UX-32: the rolled characteristics lock the Creation Method', async () => {
        await expect(playerPage.getByText('Creation method: Standard rolling')).toBeVisible()
        await expect(playerPage.getByText('Locked because your characteristics are rolled.')).toBeVisible()
        await expect(playerPage.getByRole('radio')).toHaveCount(0)
      })

      await test.step('switching to Point buy through the API is refused and Standard rolling stays', async () => {
        const change = await playerPage.request.put(characterSheetUrl(campaignId), {
          headers: { Authorization: bearer },
          data: { identity: { name: 'Mae Doyle', age: 25 }, creationMethod: 'PointBuy' },
        })
        expect(change.status()).toBe(409)
        await playerPage.reload()
        await expect(playerPage.getByText('Creation method: Standard rolling')).toBeVisible()
      })

      await test.step('the Player rolls Luck, makes the EDU check, then picks the Antiquarian and spends the minimum', async () => {
        await rollLuckViaUi(playerPage)
        await pressWizardAction(playerPage, 'Save and continue')
        await rollEduCheckViaUi(playerPage, 1)
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await playerPage.getByLabel('Credit Rating, occupation points').fill('30')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Personal interests' })).toBeVisible()
      })

      await test.step('the Player leaves the rest unspent and submits whatever the rolls are', async () => {
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step("the Keeper sees the server's eight characteristic rolls and the server-rolled Luck", async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Mae Doyle' }).click()
        await page.getByRole('button', { name: 'Dice results' }).click()
        for (const [code, dice] of CHARACTERISTIC_DICE) {
          await expect(
            page.getByRole('row', {
              name: new RegExp(`^${code} ${dice} \\d+(, \\d+)+ \\d+ Server, for ${player.account.name} .+$`),
            }),
          ).toBeVisible()
        }
        await expect(
          page.getByRole('row', {
            name: new RegExp(`^Luck 3D6 [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
          }),
        ).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('The Keeper grants a characteristics re-roll; the Player rolls again and the Keeper sees the replaced results', async ({
    page,
    browser,
  }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Re-roll ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    const bearer = await openAndCaptureBearer(playerPage, `/campaigns/${campaignId}`)
    let newValues: string[] = []

    try {
      await test.step('a Standard Rolling Investigator rolls characteristics and is submitted', async () => {
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Nina Doyle')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Standard rolling')
        await rollCharacteristicsViaUi(playerPage)
        await rollLuckViaUi(playerPage)
        await pressWizardAction(playerPage, 'Save and continue')
        await rollEduCheckViaUi(playerPage, 1)
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await playerPage.getByLabel('Credit Rating, occupation points').fill('30')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Personal interests' })).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step('the Keeper opens Request changes, sees the "Characteristics" checkbox, checks it, and sends', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Nina Doyle' }).click()
        await page.getByRole('button', { name: 'Request changes' }).click()
        const dialog = page.getByRole('dialog', { name: 'Request changes' })
        await expect(dialog.getByRole('checkbox', { name: 'Characteristics' })).toBeVisible()
        await dialog.getByRole('checkbox', { name: 'Characteristics' }).check()
        await dialog.getByLabel('What should the Player change?').fill('Roll your characteristics again')
        await dialog.getByRole('button', { name: 'Send to Player' }).click()
        await expect(page.getByRole('status').filter({ hasText: 'Sent to the Player.' })).toBeVisible()
        await expect(page.getByText('Changes requested')).toBeVisible()
      })

      await test.step('UX-39: the Player sees the grant and "Roll characteristics again"', async () => {
        await playerPage.goto(`/campaigns/${campaignId}/investigator/characteristics`)
        await expect(playerPage.getByText('Your Keeper lets you roll again: characteristics.')).toBeVisible()
        await playerPage.getByRole('button', { name: 'Roll characteristics again' }).click()
        const dialog = playerPage.getByRole('alertdialog', { name: 'Roll characteristics again?' })
        await expect(dialog).toContainText('Only your Keeper can allow a re-roll.')
        await dialog.getByRole('button', { name: 'Roll now' }).click()
        await expect(playerPage.getByRole('status').filter({ hasText: 'Characteristics rolled.' })).toBeVisible()
        newValues = (await characteristicValueItems(playerPage).allTextContents()).map(normalizeValueItem)
        expect(newValues).toHaveLength(8)
        await expect(playerPage.getByText(/\(replaced\)/)).toHaveCount(0)
      })

      await test.step('the Player resubmits', async () => {
        await playerPage.goto(`/campaigns/${campaignId}/investigator/sheet`)
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step('UX-40: the Keeper sees eight "(replaced)" characteristic rows, each after its replacement', async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Nina Doyle' }).click()
        await page.getByRole('button', { name: 'Dice results' }).click()
        for (const [code, dice] of CHARACTERISTIC_DICE) {
          await expect(
            page.getByRole('row', {
              name: new RegExp(`^${code} \\(replaced\\) ${dice} [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
            }),
          ).toBeVisible()
        }
        const texts = (
          await page
            .getByRole('table')
            .filter({ has: page.getByRole('row', { name: /\(replaced\)/ }) })
            .getByRole('row')
            .allInnerTexts()
        ).map((text) => text.replace(/\s+/g, ' ').trim())
        for (const [code, dice] of CHARACTERISTIC_DICE) {
          const current = texts.findIndex((text) => text.startsWith(`${code} ${dice} `))
          const replaced = texts.findIndex((text) => text.startsWith(`${code} (replaced) ${dice} `))
          expect(replaced).toBe(current + 1)
        }
      })

      await test.step('each characteristic value matches its non-replaced row', async () => {
        const response = await playerPage.request.get(characterSheetUrl(campaignId), {
          headers: { Authorization: bearer },
        })
        const body = (await response.json()) as {
          rules: { standardRolling: Record<string, { bonus: number; multiplier: number }> }
          characterSheet: {
            characteristics: Record<string, { value: number | null }>
            rollRecords: { purpose: string; result: number; isReplaced: boolean }[]
          }
        }
        for (const [code] of CHARACTERISTIC_DICE) {
          const formula = body.rules.standardRolling[code]
          const current = body.characterSheet.rollRecords.find(
            (record) => record.purpose === `Characteristic:${code}` && !record.isReplaced,
          )
          expect(body.characterSheet.characteristics[code].value).toBe((current!.result + formula.bonus) * formula.multiplier)
        }
      })
    } finally {
      await player.context.close()
    }
  })

  test('UX-35: a Player whose roll fails to send retries and rolls', async ({ page, browser }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Retry roll ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page

    try {
      await test.step('the Player names a 25-year-old Investigator and chooses Standard rolling', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Tommy Doyle')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Standard rolling')
      })

      await test.step('an aborted roll shows "We couldn\'t roll your characteristics. Try again."', async () => {
        await playerPage.route('**/mine/character-sheet/rolls/characteristics', (route) => route.abort())
        await playerPage.getByRole('button', { name: 'Roll characteristics' }).click()
        await playerPage.getByRole('alertdialog').getByRole('button', { name: 'Roll now' }).click()
        const alert = playerPage.getByRole('alert').filter({ hasText: "We couldn't roll your characteristics. Try again." })
        await expect(alert).toBeVisible()
      })

      await test.step('the retry rolls and shows the eight values', async () => {
        await playerPage.unroute('**/mine/character-sheet/rolls/characteristics')
        const alert = playerPage.getByRole('alert').filter({ hasText: "We couldn't roll your characteristics. Try again." })
        await alert.getByRole('button', { name: 'Try again' }).click()
        await expect(playerPage.getByRole('heading', { name: 'Your characteristics' })).toBeVisible()
        await expect(characteristicValueItems(playerPage)).toHaveCount(8)
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
        await rollLuckViaUi(playerPage)
        await pressWizardAction(playerPage, 'Save and continue')
        await rollEduCheckViaUi(playerPage, 1)
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('UX-22: the skill choices come first, and a slot still to choose waits disabled in its place', async () => {
        await chooseAntiquarianViaUi(playerPage)
        await expect(playerPage.getByRole('heading', { level: 2, name: '1. Make your skill choices' })).toBeVisible()
        const waiting = playerPage.getByRole('row', { name: /^Choose 1 interpersonal skill/ })
        await expect(waiting).toContainText('Choose this skill above first')
        await expect(waiting.getByRole('combobox')).toBeDisabled()
        await pickAntiquarianSkillsViaUi(playerPage)
        await expect(playerPage.getByRole('row', { name: /^Charm/ })).toBeVisible()
      })

      await test.step('UX-25: the Player assigns the skill values, with Credit Rating at its value and the freed 40 in its own row', async () => {
        await expect(playerPage.getByText('Must be 30 for this occupation')).toBeVisible()
        await expect(playerPage.getByRole('row', { name: /^Extra skill \(freed 40\)/ })).toBeVisible()
        await chooseOption(playerPage, 'Extra skill for the freed 40', 'Drive Auto')
        for (const [skill, value] of QUICK_FIRE_SKILLS) {
          await chooseOption(playerPage, `${skill}, Quick fire value`, value)
        }
        await expect(playerPage.getByText('Every value is assigned.')).toBeVisible()
      })

      await test.step('the value list opens on an opaque surface, so its options are readable', async () => {
        await playerPage.getByRole('combobox', { name: 'Appraise, Quick fire value', exact: true }).click()
        const list = playerPage.getByRole('listbox')
        await expect(list).toBeVisible()
        await playerPage.screenshot({ path: test.info().outputPath('quick-fire-value-list.png') })
        expect(await list.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
        await playerPage.keyboard.press('Escape')
      })

      await test.step('UX-23: "No value" clears a value and returns it to the values left', async () => {
        await chooseOption(playerPage, 'Appraise, Quick fire value', 'No value')
        await expect(playerPage.getByText('Values left to assign: 70')).toBeVisible()
        await chooseOption(playerPage, 'Appraise, Quick fire value', '70')
        await expect(playerPage.getByText('Every value is assigned.')).toBeVisible()
      })

      await test.step('UX-24: changing a choice after assigning lists the old skill with its value, its error, and "Remove value"', async () => {
        await chooseOption(playerPage, 'Choose 1 interpersonal skill', 'Persuade')
        await playerPage.getByRole('button', { name: 'Save and continue' }).click()
        const error = 'Charm is no longer one of your occupation skills. Remove its value to use it elsewhere.'
        const summary = playerPage.getByRole('alert').filter({ hasText: "There's a problem" })
        await expect(summary.getByRole('link', { name: error })).toBeVisible()
        const leftOver = playerPage.getByRole('region', { name: 'No longer occupation skills' })
        await expect(leftOver).toContainText('Charm')
        await expect(leftOver).toContainText('50')
        await summary.getByRole('link', { name: error }).click()
        await expect(leftOver.getByRole('button', { name: 'Remove value from Charm' })).toBeFocused()
        await leftOver.getByRole('button', { name: 'Remove value from Charm' }).click()
        await expect(leftOver).toHaveCount(0)
        await expect(playerPage.getByText('Values left to assign: 50')).toBeVisible()
        await chooseOption(playerPage, 'Persuade, Quick fire value', '50')
        await expect(playerPage.getByText('Every value is assigned.')).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player chooses four personal interests and submits', async () => {
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Personal interests' })).toBeVisible()
        for (const skill of ['Listen', 'Stealth', 'Psychology', 'Charm']) {
          await playerPage.getByRole('checkbox', { name: `${skill}, +20` }).check()
        }
        await expect(playerPage.getByText('Personal interests chosen: 4 of 4')).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
      })

      await test.step('UX-26: a personal interest that becomes the extra skill stays visible with its error and can be removed', async () => {
        await playerPage.getByRole('link', { name: /^Occupation skills ?, completed$/ }).click()
        await chooseOption(playerPage, 'Extra skill for the freed 40', 'Charm')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Personal interests' })).toBeVisible()
        const error = "Choose a skill that isn't an occupation skill, Credit Rating, Cthulhu Mythos, or already chosen."
        const stranded = playerPage.getByRole('region', { name: 'No longer personal interests' })
        await expect(stranded).toContainText('Charm')
        await expect(stranded).toContainText(error)
        await playerPage.getByRole('button', { name: 'Save and continue' }).click()
        const summary = playerPage.getByRole('alert').filter({ hasText: "There's a problem" })
        await summary.getByRole('link', { name: error }).click()
        const remove = stranded.getByRole('button', { name: 'Remove Charm from your personal interests' })
        await expect(remove).toBeFocused()
        await remove.click()
        await expect(stranded).toHaveCount(0)
        await expect(playerPage.getByText('Personal interests chosen: 3 of 4')).toBeVisible()
        await playerPage.getByRole('checkbox', { name: 'Drive Auto, +20' }).check()
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player submits the Quick fire Investigator', async () => {
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
        await expect(playerPage.getByRole('row', { name: /^Listen/ })).toContainText('40')
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })
    } finally {
      await player.context.close()
    }
  })

  test('UX-37: an EDU check and its gain are rolled in the same action', async ({ page, browser }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `EDU gain ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    // Point Buy with EDU at the minimum: the check likely improves EDU, and the invariants below hold either way.
    const minimumEdu: Record<string, string> = {
      STR: '65',
      CON: '65',
      DEX: '65',
      APP: '65',
      POW: '65',
      SIZ: '60',
      INT: '60',
      EDU: '15',
    }
    let improved: RegExpExecArray | null = null

    try {
      await test.step('the Player buys characteristics with EDU at the minimum and rolls Luck', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Edu Gain')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Point buy')
        await fillPointBuy(playerPage, minimumEdu)
        await rollLuckViaUi(playerPage)
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('UX-37: the rolled check reads "EDU a -> b" or "No improvement"', async () => {
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Age effects' })).toBeVisible()
        await rollEduCheckViaUi(playerPage, 1)
        const groupText = ((await playerPage.getByRole('group', { name: 'EDU check 1 of 1' }).textContent()) ?? '').replace(
          /\s+/g,
          ' ',
        )
        improved = /EDU (\d+) -> (\d+)/.exec(groupText)
        if (improved === null) {
          await expect(playerPage.getByText('No improvement')).toBeVisible()
        } else {
          expect(parseInt(improved[1], 10)).toBe(15)
        }
      })

      await test.step('the Player spends the occupation budget the improved EDU allows', async () => {
        const eduAfter = improved === null ? 15 : parseInt(improved[2], 10)
        const budget = eduAfter * 4
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        let remaining = budget
        for (const [skill, planned] of [
          ['Credit Rating', 30],
          ['Library Use', 50],
          ['Appraise', 50],
          ['History', 50],
          ['Spot Hidden', 20],
        ] as Array<[string, number]>) {
          const points = Math.min(planned, remaining)
          if (points > 0) {
            await playerPage.getByLabel(`${skill}, occupation points`).fill(String(points))
            remaining -= points
          }
        }
        await expect(playerPage.getByText(`Occupation points left: 0 of ${budget}`)).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Personal interests' })).toBeVisible()
        await playerPage.getByLabel('Drive Auto, personal interest points').fill('60')
        await playerPage.getByLabel('Listen, personal interest points').fill('60')
        await expect(playerPage.getByText('Personal interest points left: 0 of 120')).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
      })

      await test.step("the Keeper sees the check, and the gain exactly when the step showed an improvement", async () => {
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Edu Gain' }).click()
        await page.getByRole('button', { name: 'Dice results' }).click()

        const checkRow = page.getByRole('row', {
          name: new RegExp(`^EDU check 1 D100 [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
        })
        await expect(checkRow).toBeVisible()
        const [, , checkFacesText, checkResultText] = await checkRow.getByRole('cell').allTextContents()
        const checkFaces = checkFacesText.split(',').map((face) => parseInt(face.trim(), 10))
        const checkResult = parseInt(checkResultText, 10)
        console.log(`EDU check 1 faces: ${checkFacesText} (result ${checkResultText})`)
        expect(checkFaces).toHaveLength(1)
        expect(checkResult).toBe(checkFaces[0])

        const gainRow = page.getByRole('row', {
          name: new RegExp(`^EDU check 1 gain 1D10 [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
        })
        if (improved === null) {
          await expect(gainRow).toHaveCount(0)
        } else {
          const eduBefore = parseInt(improved[1], 10)
          const eduAfter = parseInt(improved[2], 10)
          expect(checkResult).toBeGreaterThan(eduBefore)
          await expect(gainRow).toBeVisible()
          const [, , gainFacesText, gainResultText] = await gainRow.getByRole('cell').allTextContents()
          const gain = parseInt(gainResultText, 10)
          console.log(`EDU check 1 gain faces: ${gainFacesText} (result ${gainResultText})`)
          expect(gain).toBeGreaterThanOrEqual(1)
          expect(gain).toBeLessThanOrEqual(10)
          expect(eduAfter).toBe(Math.min(99, eduBefore + gain))
        }

        await expect(
          page.getByRole('row', {
            name: new RegExp(`^Luck 3D6 [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
          }),
        ).toBeVisible()
      })
    } finally {
      await player.context.close()
    }
  })

  test('UX-38: a rolled EDU check locks the age bracket and EDU', async ({ page, browser }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `EDU locks ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    const bearer = await openAndCaptureBearer(playerPage, `/campaigns/${campaignId}`)
    const characteristics = Object.fromEntries(Object.entries(VALID_POINT_BUY).map(([code, value]) => [code, parseInt(value, 10)]))

    try {
      await test.step('the Player buys characteristics and rolls the EDU check', async () => {
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Edu Locks')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Point buy')
        await fillPointBuy(playerPage, VALID_POINT_BUY)
        await rollLuckViaUi(playerPage)
        await pressWizardAction(playerPage, 'Save and continue')
        await rollEduCheckViaUi(playerPage, 1)
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Occupation' })).toBeVisible()
      })

      await test.step('UX-38: EDU and the Creation Method are locked with their reasons, and the age hint shows', async () => {
        await playerPage.getByRole('link', { name: /^Characteristics ?, completed$/ }).click()
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Characteristics' })).toBeVisible()
        await expect(playerPage.getByLabel('EDU', { exact: true })).toBeDisabled()
        await expect(playerPage.getByText('Locked because you rolled an EDU check.', { exact: true })).toBeVisible()
        await expect(playerPage.getByText('Creation method: Point buy')).toBeVisible()
        await pressWizardAction(playerPage, 'Back')
        await expect(playerPage.getByText('Your age must stay between 20 and 39 because you rolled Luck and EDU checks.')).toBeVisible()
      })

      await test.step('UX-38: a PUT into another bracket and a PUT changing EDU are refused with 409', async () => {
        const refusedBracket = await playerPage.request.put(characterSheetUrl(campaignId), {
          headers: { Authorization: bearer },
          data: {
            identity: { name: 'Edu Locks', age: 45 },
            creationMethod: 'PointBuy',
            characteristics,
            ageEffects: { deductions: {}, eduImprovementChecks: [] },
          },
        })
        expect(refusedBracket.status()).toBe(409)
        const refusedEdu = await playerPage.request.put(characterSheetUrl(campaignId), {
          headers: { Authorization: bearer },
          data: {
            identity: { name: 'Edu Locks', age: 25 },
            creationMethod: 'PointBuy',
            characteristics: { ...characteristics, EDU: 60, APP: 40 },
            ageEffects: { deductions: {}, eduImprovementChecks: [] },
          },
        })
        expect(refusedEdu.status()).toBe(409)
      })

      await test.step('a reload shows nothing changed', async () => {
        await playerPage.reload()
        await expect(playerPage.getByLabel('Age')).toHaveValue('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByLabel('EDU', { exact: true })).toHaveValue('50')
      })
    } finally {
      await player.context.close()
    }
  })

  test('UX-36 and UX-38: a rolled Luck locks the age bracket', async ({ page, browser }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Luck locks ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    const bearer = await openAndCaptureBearer(playerPage, `/campaigns/${campaignId}`)
    const characteristics = Object.fromEntries(Object.entries(VALID_POINT_BUY).map(([code, value]) => [code, parseInt(value, 10)]))

    try {
      await test.step('UX-36: the Luck dialog names the age range that becomes fixed', async () => {
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Luck Locks')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Point buy')
        await fillPointBuy(playerPage, VALID_POINT_BUY)
        await playerPage.getByRole('button', { name: 'Roll Luck' }).click()
        const dialog = playerPage.getByRole('alertdialog', { name: 'Roll Luck?' })
        await expect(dialog).toContainText('between 20 and 39')
        await dialog.getByRole('button', { name: 'Roll now' }).click()
        await expect(playerPage.getByRole('status').filter({ hasText: 'Luck rolled.' })).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Age effects' })).toBeVisible()
        await pressWizardAction(playerPage, 'Back')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Characteristics' })).toBeVisible()
        await pressWizardAction(playerPage, 'Back')
        await expect(playerPage.getByText('Your age must stay between 20 and 39 because you rolled Luck.')).toBeVisible()
      })

      await test.step('UX-38: a PUT into another bracket is refused, and one within the bracket is accepted', async () => {
        const refused = await playerPage.request.put(characterSheetUrl(campaignId), {
          headers: { Authorization: bearer },
          data: {
            identity: { name: 'Luck Locks', age: 45 },
            creationMethod: 'PointBuy',
            characteristics,
            ageEffects: { deductions: {}, eduImprovementChecks: [] },
          },
        })
        expect(refused.status()).toBe(409)
        const accepted = await playerPage.request.put(characterSheetUrl(campaignId), {
          headers: { Authorization: bearer },
          data: {
            identity: { name: 'Luck Locks', age: 30 },
            creationMethod: 'PointBuy',
            characteristics,
            ageEffects: { deductions: {}, eduImprovementChecks: [] },
          },
        })
        expect(accepted.status()).toBe(200)
      })

      await test.step('a reload shows the accepted age with the rolled Luck still in place', async () => {
        await playerPage.reload()
        await expect(playerPage.getByLabel('Age')).toHaveValue('30')
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByText(/^Luck \d+$/)).toBeVisible()
        await expect(playerPage.getByLabel('EDU', { exact: true })).toBeEnabled()
      })
    } finally {
      await player.context.close()
    }
  })

  test('UX-36: a Young Investigator keeps the higher of two Luck rolls', async ({ page, browser }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Young Luck ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    let kept = 0
    let first = 0
    let second = 0

    try {
      await test.step('UX-36: the dialog rolls twice at 17 and the step keeps the higher roll', async () => {
        await playerPage.goto(`/campaigns/${campaignId}`)
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Young Luck')
        await playerPage.getByLabel('Age').fill('17')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Point buy')
        await fillPointBuy(playerPage, VALID_POINT_BUY)
        await playerPage.getByRole('button', { name: 'Roll Luck' }).click()
        const dialog = playerPage.getByRole('alertdialog', { name: 'Roll Luck?' })
        await expect(dialog).toContainText('twice at your age')
        await dialog.getByRole('button', { name: 'Roll now' }).click()
        await expect(playerPage.getByRole('status').filter({ hasText: 'Luck rolled.' })).toBeVisible()
        const stepText = ((await playerPage.getByText(/^Luck rolls \d+ and \d+, kept \d+$/).textContent()) ?? '').replace(
          /\s+/g,
          ' ',
        )
        const rolls = /Luck rolls (\d+) and (\d+), kept (\d+)/.exec(stepText)
        expect(rolls).not.toBeNull()
        first = parseInt(rolls![1], 10)
        second = parseInt(rolls![2], 10)
        kept = parseInt(rolls![3], 10)
        console.log(`Young Luck rolls: ${first} and ${second}, kept ${kept}`)
        expect(kept).toBe(Math.max(first, second))
        await pressWizardAction(playerPage, 'Save and continue')
      })

      await test.step('the Player applies the deductions for 17 and submits', async () => {
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Age effects' })).toBeVisible()
        await playerPage.getByLabel('Deduct from STR').fill('3')
        await playerPage.getByLabel('Deduct from SIZ').fill('2')
        await expect(playerPage.getByText('Still to deduct: 0')).toBeVisible()
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseAntiquarianViaUi(playerPage)
        await pickAntiquarianSkillsViaUi(playerPage)
        await spendAntiquarianPointsViaUi(playerPage)
        await playerPage.getByRole('button', { name: 'Submit to Keeper' }).click()
        await expect(ownRow(playerPage)).toContainText('Submitted - waiting for your Keeper')
      })

      await test.step("the Keeper sees both server-rolled Luck rows with the higher kept", async () => {
        await page.goto(`/campaigns/${campaignId}`)
        await attentionList(page).getByRole('link', { name: 'Review Young Luck' }).click()
        await page.getByRole('button', { name: 'Dice results' }).click()
        const shown = [first, second].map((total) => total / 5)
        for (const [label, total] of [
          ['Luck', shown[0]],
          ['Luck, second roll', shown[1]],
        ] as const) {
          const row = page.getByRole('row', {
            name: new RegExp(`^${label} 3D6 [\\d, ]+ \\d+ Server, for ${player.account.name} .+$`),
          })
          await expect(row).toBeVisible()
          const [, , facesText, resultText] = await row.getByRole('cell').allTextContents()
          const faces = facesText.split(',').map((face) => parseInt(face.trim(), 10))
          const result = parseInt(resultText, 10)
          console.log(`${label} faces: ${facesText} (result ${resultText})`)
          expect(faces).toHaveLength(3)
          for (const face of faces) {
            expect(face).toBeGreaterThanOrEqual(1)
            expect(face).toBeLessThanOrEqual(6)
          }
          expect(result).toBe(faces[0] + faces[1] + faces[2])
          expect(result).toBe(total)
        }
        expect(kept).toBe(5 * Math.max(shown[0], shown[1]))
      })
    } finally {
      await player.context.close()
    }
  })

  test('Dice results are never accepted from the Player', async ({ page, browser }) => {
    test.slow()

    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `No typed dice ${keeper.oid.slice(0, 6)}`)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const playerPage = player.page
    const bearer = await openAndCaptureBearer(playerPage, `/campaigns/${campaignId}`)
    const characteristics = Object.fromEntries(Object.entries(VALID_POINT_BUY).map(([code, value]) => [code, parseInt(value, 10)]))
    const baseSheet = {
      identity: { name: 'Typed Dice', age: 25 },
      creationMethod: 'PointBuy',
      characteristics,
      ageEffects: { deductions: {}, eduImprovementChecks: [] },
    }

    try {
      await test.step('the Player reaches Age effects with an app-rolled Luck', async () => {
        await attentionList(playerPage).getByRole('button', { name: 'Create Investigator' }).click()
        await playerPage.getByLabel('Investigator name').fill('Typed Dice')
        await playerPage.getByLabel('Age').fill('25')
        await pressWizardAction(playerPage, 'Save and continue')
        await chooseCreationMethod(playerPage, 'Point buy')
        await fillPointBuy(playerPage, VALID_POINT_BUY)
        await rollLuckViaUi(playerPage)
        await pressWizardAction(playerPage, 'Save and continue')
        await expect(playerPage.getByRole('heading', { level: 1, name: 'Age effects' })).toBeVisible()
      })

      await test.step('PUTs carrying dice results are refused with 400 and change nothing', async () => {
        const accepted = await playerPage.request.put(characterSheetUrl(campaignId), {
          headers: { Authorization: bearer },
          data: baseSheet,
        })
        expect(accepted.status()).toBe(200)
        const before = await (await playerPage.request.get(characterSheetUrl(campaignId), { headers: { Authorization: bearer } })).text()

        for (const dice of [
          { luckRolls: [11] },
          { characteristicRolls: { STR: 60 } },
          { ageEffects: { deductions: {}, eduImprovementChecks: [{ check: 30, gain: null }] } },
        ]) {
          const refused = await playerPage.request.put(characterSheetUrl(campaignId), {
            headers: { Authorization: bearer },
            data: { ...baseSheet, ...dice },
          })
          expect(refused.status()).toBe(400)
        }

        const after = await (await playerPage.request.get(characterSheetUrl(campaignId), { headers: { Authorization: bearer } })).text()
        expect(after).toBe(before)
      })
    } finally {
      await player.context.close()
    }
  })
})

/** Every characteristic with the dice the server rolls for it (docs/game-rules coc7_character_creation_and_development_rules.md section 2.1). */
const CHARACTERISTIC_DICE: [code: string, dice: string][] = [
  ['STR', '3D6'],
  ['CON', '3D6'],
  ['DEX', '3D6'],
  ['APP', '3D6'],
  ['POW', '3D6'],
  ['SIZ', '2D6'],
  ['INT', '2D6'],
  ['EDU', '2D6'],
]

/** The Player's character-sheet endpoint and the characteristics-roll endpoint for direct API checks. */
function characterSheetUrl(campaignId: string): string {
  return `${API_ORIGIN}/api/campaigns/${campaignId}/investigators/mine/character-sheet`
}

/** The characteristics-roll endpoint for direct API checks. */
function rollCharacteristicsUrl(campaignId: string): string {
  return `${characterSheetUrl(campaignId)}/rolls/characteristics`
}

/** The eight "CODE value" items of the rolled characteristics list. */
function characteristicValueItems(page: Page): Locator {
  return page.getByRole('listitem').filter({ hasText: /^[A-Z]{3} \d+$/ })
}

/** Collapses JSX whitespace so a value item reads "CODE value" before and after a reload. */
function normalizeValueItem(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

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
