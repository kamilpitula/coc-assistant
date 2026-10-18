import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import {
  createHumanNpcViaUi,
  createMythosCreatureViaUi,
  detailsFieldset,
  humanNpcsApiUrl,
  mythosCreatureIdFromUrl,
  mythosCreaturesApiUrl,
  nonPlayerEntitiesApiUrl,
  nonPlayerEntitiesSection,
  nonPlayerEntityLinks,
  openEditor,
  saveMythosCreatureEditor,
  submitMythosCreatureForm,
} from '../fixtures/non-player-entities'
import { campaignNav } from '../fixtures/overview'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Keeper creates a Mythos Creature", "Keeper finds a profile in
 * the list" (Mythos Creature part), "Malformed dice notation is refused", "A Derived Value Override needs a reason",
 * "A Mythos Creature's firearm attack cannot add Damage Bonus", "Hit Points not applicable needs a defeat outcome", "Keeper
 * deletes an unlinked profile" (Mythos Creature part), and "Non-Player Entity profiles are the Keeper's alone" (Mythos
 * Creature part), and to specs/scenario-preparation/ux.md SP-UX-29, SP-UX-31 to SP-UX-33, SP-UX-35 to SP-UX-37,
 * SP-UX-39, SP-UX-41, SP-UX-45 to SP-UX-48, SP-A11Y-20, and SP-A11Y-28.
 *
 * Exceptions: SP-UX-38 (Duplicate) belongs to PBI-SP-010. SP-UX-34 (the 100-row limit), SP-UX-40 (double activation),
 * SP-UX-49 (APP and EDU), and the override range edges are covered by component and unit tests, where an end-to-end run
 * would only repeat them slowly.
 */
test.describe('Mythos Creatures', () => {
  test('Keeper creates a Mythos Creature and finds it in the list', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Creatures ${keeper.oid.slice(0, 6)}`)

    await test.step('SP-UX-31: choosing Mythos Creature hides Age and the name is the only other field', async () => {
      await page.goto(`/campaigns/${campaignId}/non-player-entities/new`)
      await expect(page.getByRole('radio', { name: 'Mythos Creature' })).toBeEnabled()
      await page.getByRole('radio', { name: 'Mythos Creature' }).click()
      await expect(page.getByLabel('Age', { exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByText('Enter a name.')).toBeVisible()
      await expect(page.getByLabel('Name', { exact: true })).toBeFocused()
    })

    await test.step('SP-UX-32, SP-UX-41: a name opens the new profile under the Overview tab', async () => {
      await submitMythosCreatureForm(page, 'Ghoul')
      await expect(page.getByRole('status').filter({ hasText: 'Mythos Creature created.' })).toBeVisible()
      await expect(page.getByText('No details yet.')).toBeVisible()
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })

    await test.step('SP-UX-29: the list shows both types by name with their type, and the name opens the profile', async () => {
      await createHumanNpcViaUi(page, campaignId, 'Mr. Knott', '62')
      await page.goto(`/campaigns/${campaignId}/non-player-entities`)
      await expect(nonPlayerEntityLinks(page)).toHaveText(['Ghoul', 'Mr. Knott'])
      await expect(page.getByRole('table').getByRole('cell', { name: 'Mythos Creature' })).toHaveCount(1)
      await nonPlayerEntityLinks(page).getByText('Ghoul').click()
      await expect(page.getByRole('heading', { level: 1, name: 'Ghoul' })).toBeVisible()
      await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/mythos-creatures/[0-9a-f-]{36}$`))
    })

    await test.step('SP-UX-28: the Overview counts both types', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(nonPlayerEntitiesSection(page).getByText('1 Human NPC and 1 Mythos Creature.')).toBeVisible()
    })
  })

  test("Keeper records a Ghoul's Monster Profile", async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Ghoul ${keeper.oid.slice(0, 6)}`)
    await createMythosCreatureViaUi(page, campaignId, 'Ghoul')
    await openEditor(page)

    await test.step('SP-UX-33: the Creature Kind and Characteristics are filled in', async () => {
      await page.getByRole('combobox', { name: 'Creature Kind' }).click()
      await page.getByRole('option', { name: 'Mythos', exact: true }).click()
      await page.getByRole('button', { name: 'Add Characteristics' }).click()
      await expect(page.getByLabel('STR Strength')).toBeFocused()
      for (const [label, value] of [
        ['STR Strength', '80'],
        ['CON Constitution', '60'],
        ['SIZ Size', '60'],
        ['DEX Dexterity', '60'],
        ['INT Intelligence', '60'],
        ['POW Power', '60'],
      ]) {
        await page.getByLabel(label).fill(value)
      }
    })

    await test.step('SP-UX-33: Combat takes 3 attacks per round and a claw "Fighting" 40 "1D6+DB"', async () => {
      await page.getByRole('button', { name: 'Add Combat' }).click()
      await page.getByLabel('Attacks per round').fill('3')
      await page.getByRole('button', { name: 'Add attack' }).click()
      const claw = page.getByRole('group', { name: 'Attack 1' })
      await expect(claw.getByLabel('Name')).toBeFocused()
      await expect(claw.getByLabel('Skill')).toHaveValue('Fighting')
      await claw.getByLabel('Name').fill('Claw')
      await claw.getByLabel('Value').fill('40')
      await claw.getByLabel('Damage').fill('1D6+DB')
    })

    await test.step('Defenses, a spell, a power, and the sanity loss are added', async () => {
      await page.getByRole('button', { name: 'Add Defenses' }).click()
      await page.getByLabel('Armor points').fill('0')
      await page.getByRole('button', { name: 'Add immunity' }).click()
      await page.getByRole('group', { name: 'Immunity 1' }).getByLabel('Description').fill('Ordinary bullets inflict no damage.')
      await page.getByRole('button', { name: 'Add Spells' }).click()
      await page.getByRole('button', { name: 'Add spell' }).click()
      await page.getByRole('group', { name: 'Spell 1' }).getByLabel('Name').fill('Contact Deity')
      await page.getByRole('button', { name: 'Add Powers' }).click()
      await page.getByRole('button', { name: 'Add power' }).click()
      await page.getByRole('group', { name: 'Power 1' }).getByLabel('Name').fill('Drain')
      await page.getByRole('group', { name: 'Power 1' }).getByLabel('Limits').fill('Once per day')
      await page.getByRole('button', { name: 'Add Sanity loss' }).click()
      await page.getByLabel('Sanity loss', { exact: true }).fill('0/1D6')
    })

    await test.step('SP-UX-45: the section index follows the sections and moves focus to one (edit)', async () => {
      const index = page.getByRole('navigation', { name: 'On this page' })
      await expect(index.getByRole('link')).toHaveText([
        'Details',
        'Characteristics',
        'Combat',
        'Defenses',
        'Spells',
        'Powers',
        'Sanity loss',
        'Keeper notes',
      ])
      await index.getByRole('link', { name: 'Combat' }).click()
      await expect(page.getByRole('group', { name: 'Combat' })).toBeFocused()
    })

    await test.step('SP-UX-36, SP-UX-48: after Save the view shows the computed values and difficulty as text', async () => {
      await saveMythosCreatureEditor(page)
      await expect(page.getByText(/Mythos Creature.*Mythos/)).toBeVisible()
      await expect(page.getByRole('heading', { level: 3, name: 'Worked-out values' })).toBeVisible()
      await expect(page.getByRole('term').filter({ hasText: /^Hit Points$/ })).toBeVisible()
      await expect(page.getByRole('definition').filter({ hasText: /^\+1D4$/ })).toBeVisible()
      await expect(page.getByRole('table', { name: 'Characteristics' }).getByRole('row', { name: /STR Strength/ })).toContainText('Hard')
      await expect(page.getByRole('table', { name: 'Attacks' }).getByRole('row', { name: /Claw/ })).toContainText('Fighting 40%')
      await expect(page.getByRole('table', { name: 'Attacks' }).getByRole('row', { name: /Claw/ })).toContainText('Regular')
      await expect(page.getByText('Sanity loss 0/1D6')).toBeVisible()
      await expect(page.getByText(/MOV/)).toHaveCount(0)
      await expect(page.getByText(/half value|fifth value/i)).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
    })

    await test.step('SP-UX-45, SP-A11Y-28: in the view, the index link moves focus to Sanity loss', async () => {
      await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Sanity loss' }).click()
      await expect(page.locator('#section-sanityLoss')).toBeFocused()
    })
  })

  test('Keeper is told about malformed dice notation', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Dice ${keeper.oid.slice(0, 6)}`)
    await createMythosCreatureViaUi(page, campaignId, 'Ghoul')
    await openEditor(page)
    await page.getByRole('button', { name: 'Add Combat' }).click()
    await page.getByRole('button', { name: 'Add attack' }).click()
    const attack = page.getByRole('group', { name: 'Attack 1' })
    await attack.getByLabel('Name').fill('Claw')
    await attack.getByLabel('Value').fill('40')
    await attack.getByLabel('Damage').fill('D')
    await page.getByRole('button', { name: 'Add Sanity loss' }).click()
    await page.getByLabel('Sanity loss', { exact: true }).fill('1D6')

    await test.step('SP-UX-35, SP-A11Y-20: Save is refused with one summary link per problem and nothing is saved', async () => {
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const summary = page.getByRole('alert').filter({ hasText: 'There are 2 problems' })
      await expect(summary).toBeFocused()
      await expect(summary).toContainText('Write the damage as dice and numbers, for example 1D6+DB or 2D6-1.')
      await expect(summary).toContainText('Write the Sanity loss as success/failure, for example 0/1D6.')
      await summary.getByRole('link', { name: /Sanity loss as success/ }).click()
      await expect(page.getByLabel('Sanity loss', { exact: true })).toBeFocused()
    })

    await test.step("a firearm attack can't add Damage Bonus: the message says so and the link reaches Damage", async () => {
      await page.getByLabel('Sanity loss', { exact: true }).fill('0/1D6')
      await attack.getByLabel('Skill').fill('Firearms (Rifle)')
      await attack.getByLabel('Damage').fill('2D6+DB')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const summary = page.getByRole('alert').filter({ hasText: 'There is 1 problem' })
      await expect(summary).toContainText("Damage Bonus doesn't apply to firearms. Remove DB from the damage.")
      await summary.getByRole('link').click()
      await expect(attack.getByLabel('Damage')).toBeFocused()
    })

    await test.step('SP-UX-47: More details opens by itself for a problem inside it, even after the Keeper closed it', async () => {
      await attack.getByLabel('Damage').fill('2D6')
      await attack.getByRole('button', { name: 'More details for Claw' }).click()
      await attack.getByLabel('Effect').fill('x'.repeat(1001))
      await attack.getByRole('button', { name: 'More details for Claw' }).click()
      await expect(attack.getByRole('button', { name: 'More details for Claw' })).toHaveAttribute('aria-expanded', 'false')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(attack.getByRole('button', { name: 'More details for Claw' })).toHaveAttribute('aria-expanded', 'true')
      await expect(page.getByRole('alert').filter({ hasText: 'There is 1 problem' })).toContainText('Effect must be 1,000 characters or fewer.')
      await attack.getByLabel('Effect').fill('Grapples on a hit.')
      await saveMythosCreatureEditor(page)
      await expect(page.getByText('Sanity loss 0/1D6')).toBeVisible()
    })
  })

  test('A Hit Points override needs a reason and shows the computed value', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Override ${keeper.oid.slice(0, 6)}`)
    await createMythosCreatureViaUi(page, campaignId, 'Ghoul')
    await openEditor(page)
    await page.getByRole('button', { name: 'Add Characteristics' }).click()
    await page.getByLabel('CON Constitution').fill('60')
    await page.getByLabel('SIZ Size').fill('60')

    await test.step('SP-UX-46: Override reveals the value and reason, and Save without a reason is refused (SP-UX-35)', async () => {
      await page.getByRole('radio', { name: 'Override', exact: true }).click()
      await expect(page.getByLabel('Hit Points', { exact: true })).toBeFocused()
      await page.getByLabel('Hit Points', { exact: true }).fill('25')
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const summary = page.getByRole('alert').filter({ hasText: 'There is 1 problem' })
      await expect(summary).toContainText('Give a reason for the override.')
      await summary.getByRole('link').click()
      await expect(page.getByLabel('Reason for the Hit Points override')).toBeFocused()
    })

    await test.step('SP-UX-36: with a reason the profile shows the override beside the computed Hit Points', async () => {
      await page.getByLabel('Reason for the Hit Points override').fill('Swollen with stolen life')
      await saveMythosCreatureEditor(page)
      await expect(page.getByText('25 (computed 12)')).toBeVisible()
      await expect(page.getByText('Reason: Swollen with stolen life')).toBeVisible()
    })
  })

  test('Hit Points not applicable needs a defeat outcome', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Defeat ${keeper.oid.slice(0, 6)}`)
    await createMythosCreatureViaUi(page, campaignId, 'Shade')
    await openEditor(page)
    await page.getByRole('button', { name: 'Add Characteristics' }).click()
    await page.getByRole('radio', { name: 'Not applicable' }).click()
    await expect(page.getByText('Describe the Defeat outcome under Details.')).toBeVisible()

    await test.step('SP-UX-35: Save without a defeat outcome is refused and the link reaches that field', async () => {
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const summary = page.getByRole('alert').filter({ hasText: 'There is 1 problem' })
      await expect(summary).toContainText("Describe the defeat outcome, because Hit Points don't apply.")
      await summary.getByRole('link').click()
      await expect(detailsFieldset(page).getByLabel('Defeat outcome')).toBeFocused()
    })

    await test.step('SP-UX-46: with a defeat outcome the profile shows "Not applicable" and the outcome', async () => {
      await detailsFieldset(page).getByLabel('Defeat outcome').fill('It dissolves into black water at dawn.')
      await saveMythosCreatureEditor(page)
      await expect(page.getByRole('definition').filter({ hasText: /^Not applicable/ })).toBeVisible()
      await expect(page.getByText('Defeat outcome: It dissolves into black water at dawn.')).toBeVisible()
    })
  })

  test('Keeper deletes a Mythos Creature', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Delete ${keeper.oid.slice(0, 6)}`)
    await createMythosCreatureViaUi(page, campaignId, 'Ghoul')

    await test.step('SP-UX-37: Cancel keeps the profile', async () => {
      await page.getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page.getByRole('alertdialog', { name: 'Delete Ghoul?' })).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Ghoul' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeFocused()
    })

    await test.step('SP-UX-37: confirming returns to the list with "Ghoul deleted." and without the profile', async () => {
      await page.getByRole('button', { name: 'Delete', exact: true }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/non-player-entities$`))
      await expect(page.getByRole('status').filter({ hasText: 'Ghoul deleted.' })).toBeVisible()
      await expect(page.getByText('No Non-Player Entities yet.')).toBeVisible()
    })
  })

  test("Players and other Keepers can't see Mythos Creatures", async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Hidden ${keeper.oid.slice(0, 6)}`)
    const humanNpcId = await createHumanNpcViaUi(page, campaignId, 'Secret informant', '40')
    const mythosCreatureId = await createMythosCreatureViaUi(page, campaignId, 'Hidden horror')
    expect(mythosCreatureIdFromUrl(page)).toBe(mythosCreatureId)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))
    const profilePath = `/campaigns/${campaignId}/mythos-creatures/${mythosCreatureId}`

    try {
      await test.step("SP-UX-39: the Player's profile URL shows not found and never the name", async () => {
        await player.page.goto(profilePath)
        await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Non-Player Entity" })).toBeVisible()
        await expect(player.page.getByText('Hidden horror')).toHaveCount(0)
      })

      await test.step("the Player's bearer gets 404 on GET, PUT, DELETE, and POST", async () => {
        const bearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
        await expectAllNotFound(player.page, bearer, campaignId, mythosCreatureId)
      })

      await test.step("another Keeper's bearer gets 404 on every endpoint, and the UI shows the Campaign not found", async () => {
        const bearer = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        await expectAllNotFound(otherKeeper.page, bearer, campaignId, mythosCreatureId)
        await otherKeeper.page.goto(profilePath)
        await expect(otherKeeper.page.getByRole('heading', { name: "We couldn't find that Campaign" })).toBeVisible()
      })

      await test.step('SP-UX-39: a Mythos Creature id on the Human NPC route, and the reverse, shows not found', async () => {
        await page.goto(`/campaigns/${campaignId}/human-npcs/${mythosCreatureId}`)
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Non-Player Entity" })).toBeVisible()
        await page.goto(`/campaigns/${campaignId}/mythos-creatures/${humanNpcId}`)
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Non-Player Entity" })).toBeVisible()
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })
})

async function expectAllNotFound(page: Page, bearer: string, campaignId: string, mythosCreatureId: string): Promise<void> {
  const headers = { Authorization: bearer }
  const responses = [
    await page.request.get(nonPlayerEntitiesApiUrl(API_ORIGIN, campaignId), { headers }),
    await page.request.post(mythosCreaturesApiUrl(API_ORIGIN, campaignId), { headers, data: { name: 'Intruder' } }),
    await page.request.get(mythosCreaturesApiUrl(API_ORIGIN, campaignId, `/${mythosCreatureId}`), { headers }),
    await page.request.put(mythosCreaturesApiUrl(API_ORIGIN, campaignId, `/${mythosCreatureId}`), { headers, data: { name: 'Intruder' } }),
    await page.request.delete(mythosCreaturesApiUrl(API_ORIGIN, campaignId, `/${mythosCreatureId}`), { headers }),
    await page.request.get(humanNpcsApiUrl(API_ORIGIN, campaignId, `/${mythosCreatureId}`), { headers }),
  ]
  expect(responses.map((response) => response.status())).toEqual([404, 404, 404, 404, 404, 404])
}
