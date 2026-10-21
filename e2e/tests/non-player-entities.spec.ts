import { test, expect } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import {
  createHumanNpcViaUi,
  humanNpcIdFromUrl,
  humanNpcsApiUrl,
  mythosCreaturesApiUrl,
  nonPlayerEntitiesApiUrl,
  nonPlayerEntitiesSection,
  nonPlayerEntityLinks,
  openEditor,
  saveEditor,
  submitHumanNpcForm,
} from '../fixtures/non-player-entities'
import { campaignNav } from '../fixtures/overview'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Keeper creates a narrative Human NPC", "A Human NPC needs a name
 * and an age", "Keeper finds a profile in the list" (Human NPC part), "A Human NPC's derived values follow the rules",
 * "MOV is not computed outside the covered ages", "An Opposing Value shows the Investigator's difficulty", "Keeper adds
 * and removes optional sections", "A firearm weapon cannot add Damage Bonus", "Keeper deletes an unlinked profile", "Keeper
 * duplicates a profile" (Human NPC part), and "Non-Player Entity profiles are the Keeper's alone" (Human NPC part), and
 * to specs/scenario-preparation/ux.md SP-UX-28 to SP-UX-43 and SP-A11Y-22.
 *
 * Exceptions: the Mythos Creature parts of the list, delete, duplicate, and Keeper-only scenarios are in
 * mythos-creatures.spec.ts. SP-UX-34 (the 100-row limit) and SP-UX-40 (double activation) are covered by component
 * tests, where an end-to-end run would only repeat them slowly. The scenario line "linked to no Scene" waits for Scene
 * links (PBI-SP-004).
 */
test.describe('Non-Player Entities', () => {
  test('Keeper creates a Human NPC and finds it in the list', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `NPCs ${keeper.oid.slice(0, 6)}`)

    await test.step('SP-UX-28: the Overview offers Create and says there are none yet', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(nonPlayerEntitiesSection(page).getByRole('heading', { level: 2, name: 'Non-Player Entities' })).toBeVisible()
      await expect(nonPlayerEntitiesSection(page).getByText('No Non-Player Entities yet.')).toBeVisible()
      await nonPlayerEntitiesSection(page).getByRole('link', { name: 'Create Non-Player Entity' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Create Non-Player Entity' })).toBeVisible()
    })

    await test.step('SP-UX-31: submitting an empty form explains each field and saves nothing', async () => {
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByText('Choose Human NPC or Mythos Creature.')).toBeVisible()
      await expect(page.getByText('Enter a name.')).toBeVisible()
      await page.getByRole('radio', { name: 'Human NPC' }).click()
      await page.getByLabel('Name', { exact: true }).fill('Mr. Knott')
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      await expect(page.getByText('Enter an age.')).toBeVisible()
      await expect(page.getByLabel('Age', { exact: true })).toBeFocused()
    })

    await test.step('SP-UX-32, SP-UX-41: a valid name and age open the new profile under the Overview tab', async () => {
      await submitHumanNpcForm(page, 'Mr. Knott', '62')
      await expect(page.getByRole('status').filter({ hasText: 'Human NPC created.' })).toBeVisible()
      await expect(page.getByText('Age 62')).toBeVisible()
      await expect(page.getByText('No details yet.')).toBeVisible()
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })

    await test.step('SP-UX-29: the list shows every entity by name with its type, sorted by name', async () => {
      await createHumanNpcViaUi(page, campaignId, 'Desk sergeant', '45')
      await page.goto(`/campaigns/${campaignId}/non-player-entities`)
      await expect(nonPlayerEntityLinks(page)).toHaveText(['Desk sergeant', 'Mr. Knott'])
      await expect(page.getByRole('table').getByRole('cell', { name: 'Human NPC' })).toHaveCount(2)
    })

    await test.step('SP-UX-30: searching narrows the list and announces the count; Clear filters restores it', async () => {
      await page.getByLabel('Search by name').fill('kno')
      await expect(nonPlayerEntityLinks(page)).toHaveText(['Mr. Knott'])
      await expect(page.getByText('1 shown.')).toBeVisible()
      await page.getByLabel('Search by name').fill('zzz')
      await page.getByRole('button', { name: 'Clear filters' }).click()
      await expect(nonPlayerEntityLinks(page)).toHaveText(['Desk sergeant', 'Mr. Knott'])
      await expect(page.getByLabel('Search by name')).toBeFocused()
    })

    await test.step('SP-UX-28: the Overview counts both and links to the list', async () => {
      await page.goto(`/campaigns/${campaignId}`)
      await expect(nonPlayerEntitiesSection(page).getByText('2 Human NPCs.')).toBeVisible()
      await nonPlayerEntitiesSection(page).getByRole('link', { name: 'View all Non-Player Entities' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Non-Player Entities' })).toBeVisible()
    })
  })

  test('Keeper adds sections and sees worked-out values and difficulty', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Values ${keeper.oid.slice(0, 6)}`)
    await createHumanNpcViaUi(page, campaignId, 'Thug', '30')

    await test.step('SP-UX-33: Add Characteristics inserts the section, focuses its first field, and announces it', async () => {
      await openEditor(page)
      await page.getByRole('button', { name: 'Add Characteristics' }).click()
      await expect(page.getByLabel('STR Strength')).toBeFocused()
      await expect(page.getByRole('status').filter({ hasText: 'Characteristics section added.' })).toBeAttached()
      for (const [label, value] of [['STR Strength', '70'], ['CON Constitution', '60'], ['SIZ Size', '65'], ['DEX Dexterity', '55'], ['POW Power', '50']]) {
        await page.getByLabel(label).fill(value)
      }
    })

    await test.step('SP-UX-33: Add Skills and a skill row take Spot Hidden at 55', async () => {
      await page.getByRole('button', { name: 'Add Skills' }).click()
      await page.getByRole('button', { name: 'Add skill' }).click()
      const row = page.getByRole('group', { name: 'Skill 1' })
      await expect(row.getByLabel('Skill', { exact: true })).toBeFocused()
      await row.getByLabel('Skill', { exact: true }).fill('Spot Hidden')
      await row.getByLabel('Value').fill('55')
    })

    await test.step('SP-UX-36, SP-UX-42: after Save the view shows the values, difficulty as text, and no half or fifth values', async () => {
      await saveEditor(page)
      await expect(page.getByRole('heading', { level: 3, name: 'Worked-out values' })).toBeVisible()
      await expect(page.getByRole('term').filter({ hasText: /^Hit Points$/ })).toBeVisible()
      await expect(page.getByRole('term').filter({ hasText: /^Magic Points$/ })).toBeVisible()
      await expect(page.getByRole('definition').filter({ hasText: /^\+1D4$/ })).toBeVisible()
      await expect(page.getByRole('definition').filter({ hasText: /^12$/ })).toBeVisible()
      await expect(page.getByRole('table', { name: 'Skills' }).getByRole('row', { name: /Spot Hidden/ })).toContainText('Hard')
      await expect(page.getByRole('table', { name: 'Characteristics' }).getByRole('row', { name: /STR Strength/ })).toContainText('Hard')
      await expect(page.getByText(/half value|fifth value/i)).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
    })

    await test.step('SP-UX-33: removing the Skills section asks first, and Save drops it', async () => {
      await openEditor(page)
      await page.getByRole('button', { name: 'Remove Skills section' }).click()
      await expect(page.getByRole('alertdialog', { name: 'Remove the Skills section?' })).toBeVisible()
      await page.getByRole('button', { name: 'Remove section' }).click()
      await expect(page.getByRole('button', { name: 'Add Skills' })).toBeFocused()
      await saveEditor(page)
      await expect(page.getByRole('heading', { level: 2, name: 'Skills' })).toHaveCount(0)
    })

    await test.step('SP-UX-36: MOV is not covered outside ages 15 to 89', async () => {
      await createHumanNpcViaUi(page, campaignId, 'Old Whateley', '95')
      await openEditor(page)
      await page.getByRole('button', { name: 'Add Characteristics' }).click()
      for (const [label, value] of [['STR Strength', '40'], ['DEX Dexterity', '40'], ['SIZ Size', '60']]) {
        await page.getByLabel(label).fill(value)
      }
      await saveEditor(page)
      await expect(page.getByText('Not covered by the rules for this age')).toBeVisible()
    })
  })

  test("Keeper is told a firearm can't add Damage Bonus", async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Firearm ${keeper.oid.slice(0, 6)}`)
    await createHumanNpcViaUi(page, campaignId, 'Gangster', '40')
    await openEditor(page)

    await test.step('the Keeper gives the Gangster Firearms (Handgun) and a revolver using 1D10+DB', async () => {
      await page.getByRole('button', { name: 'Add Skills' }).click()
      await page.getByRole('button', { name: 'Add skill' }).click()
      const row = page.getByRole('group', { name: 'Skill 1' })
      await row.getByLabel('Skill', { exact: true }).fill('Firearms')
      await row.getByRole('combobox', { name: 'Specialization' }).click()
      await page.getByRole('option', { name: 'Handgun' }).click()
      await row.getByLabel('Value').fill('60')
      await page.getByRole('button', { name: 'Add Combat' }).click()
      await page.getByRole('button', { name: 'Add weapon' }).click()
      const weapon = page.getByRole('group', { name: 'Weapon 1' })
      await weapon.getByLabel('Name', { exact: true }).fill('Revolver')
      await weapon.getByRole('combobox', { name: 'Skill' }).click()
      await page.getByRole('option', { name: 'Firearms (Handgun)' }).click()
      await weapon.getByLabel('Damage').fill('1D10+DB')
      await weapon.getByLabel('Attacks per round').fill('1')
    })

    await test.step('SP-UX-35, SP-A11Y-20: Save is refused, the summary takes focus, and its link reaches the Damage field', async () => {
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      const summary = page.getByRole('alert').filter({ hasText: 'There is 1 problem' })
      await expect(summary).toBeFocused()
      await expect(summary).toContainText("Damage Bonus doesn't apply to firearms. Remove DB from the damage.")
      await summary.getByRole('link').click()
      await expect(page.getByRole('group', { name: 'Weapon 1' }).getByLabel('Damage')).toBeFocused()
    })

    await test.step('removing DB lets the save through and the profile shows the weapon', async () => {
      await page.getByRole('group', { name: 'Weapon 1' }).getByLabel('Damage').fill('1D10')
      await saveEditor(page)
      await expect(page.getByRole('table', { name: 'Weapons' }).getByRole('row', { name: /Revolver/ })).toContainText('Firearms (Handgun) 60%')
    })
  })

  test('Keeper deletes a Human NPC', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Delete ${keeper.oid.slice(0, 6)}`)
    await createHumanNpcViaUi(page, campaignId, 'Mr. Knott', '62')

    await test.step('SP-UX-37: Cancel keeps the profile', async () => {
      await page.getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page.getByRole('alertdialog', { name: 'Delete Mr. Knott?' })).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Mr. Knott' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeFocused()
    })

    await test.step('SP-UX-37: confirming returns to the list with "Mr. Knott deleted." and without the profile', async () => {
      await page.getByRole('button', { name: 'Delete', exact: true }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/non-player-entities$`))
      await expect(page.getByRole('status').filter({ hasText: 'Mr. Knott deleted.' })).toBeVisible()
      await expect(page.getByText('No Non-Player Entities yet.')).toBeVisible()
    })
  })

  test('Keeper duplicates a Human NPC', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Copy ${keeper.oid.slice(0, 6)}`)
    const sourceId = await createHumanNpcViaUi(page, campaignId, 'Mr. Knott', '62')
    await openEditor(page)
    await page.getByRole('button', { name: 'Add Characteristics' }).click()
    for (const [label, value] of [['STR Strength', '70'], ['CON Constitution', '60'], ['SIZ Size', '65'], ['DEX Dexterity', '55'], ['POW Power', '50']]) {
      await page.getByLabel(label).fill(value)
    }
    await saveEditor(page)

    await test.step('SP-UX-38: Duplicate opens the copy with its status, its heading focused, and the same age and section', async () => {
      await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Mr. Knott (copy)' })).toBeVisible()
      expect(humanNpcIdFromUrl(page)).not.toBe(sourceId)
      await expect(page.getByRole('status').filter({ hasText: "Copy created. It isn't part of any Scene." })).toBeVisible()
      await expect(page.getByRole('status').filter({ hasText: 'Human NPC saved.' })).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1, name: 'Mr. Knott (copy)' })).toBeFocused()
      await expect(page.getByText('Age 62')).toBeVisible()
      await expect(page.getByRole('table', { name: 'Characteristics' }).getByRole('row', { name: /STR Strength/ })).toContainText('Hard')
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })

    await test.step('SP-UX-29: the list shows the source and the copy', async () => {
      await page.goto(`/campaigns/${campaignId}/non-player-entities`)
      await expect(nonPlayerEntityLinks(page)).toHaveText(['Mr. Knott', 'Mr. Knott (copy)'])
    })
  })

  test("Players and other Keepers can't see Human NPCs", async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Private ${keeper.oid.slice(0, 6)}`)
    const humanNpcId = await createHumanNpcViaUi(page, campaignId, 'Secret informant', '40')
    expect(humanNpcIdFromUrl(page)).toBe(humanNpcId)
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))
    const profilePath = `/campaigns/${campaignId}/human-npcs/${humanNpcId}`

    try {
      await test.step("SP-UX-28: the Player's Overview has no Non-Player Entities section", async () => {
        await player.page.goto(`/campaigns/${campaignId}`)
        await expect(player.page.getByRole('heading', { level: 1, name: /.+/ })).toBeVisible()
        await expect(nonPlayerEntitiesSection(player.page)).toHaveCount(0)
      })

      await test.step("SP-UX-39: the Player's profile, list, and create URLs show not found", async () => {
        for (const path of [profilePath, `/campaigns/${campaignId}/non-player-entities`, `/campaigns/${campaignId}/non-player-entities/new`]) {
          await player.page.goto(path)
          await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Non-Player Entity" })).toBeVisible()
        }
        await expect(player.page.getByText('Secret informant')).toHaveCount(0)
      })

      await test.step("the Player's bearer gets 404 on every endpoint", async () => {
        const bearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
        await expectAllNotFound(player.page, bearer, campaignId, humanNpcId)
      })

      await test.step("another Keeper's bearer gets 404 on every endpoint, and the UI shows the Campaign not found", async () => {
        const bearer = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        await expectAllNotFound(otherKeeper.page, bearer, campaignId, humanNpcId)
        await otherKeeper.page.goto(profilePath)
        await expect(otherKeeper.page.getByRole('heading', { name: "We couldn't find that Campaign" })).toBeVisible()
      })

      await test.step("the refused duplicates added nothing: the Keeper's list still has one profile", async () => {
        await page.goto(`/campaigns/${campaignId}/non-player-entities`)
        await expect(nonPlayerEntityLinks(page)).toHaveText(['Secret informant'])
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })
})

async function expectAllNotFound(page: import('@playwright/test').Page, bearer: string, campaignId: string, humanNpcId: string): Promise<void> {
  const headers = { Authorization: bearer }
  const body = { name: 'Intruder', age: 30 }
  const responses = [
    await page.request.get(nonPlayerEntitiesApiUrl(API_ORIGIN, campaignId), { headers }),
    await page.request.post(humanNpcsApiUrl(API_ORIGIN, campaignId), { headers, data: body }),
    await page.request.get(humanNpcsApiUrl(API_ORIGIN, campaignId, `/${humanNpcId}`), { headers }),
    await page.request.put(humanNpcsApiUrl(API_ORIGIN, campaignId, `/${humanNpcId}`), { headers, data: body }),
    await page.request.delete(humanNpcsApiUrl(API_ORIGIN, campaignId, `/${humanNpcId}`), { headers }),
    await page.request.post(humanNpcsApiUrl(API_ORIGIN, campaignId, `/${humanNpcId}/duplicate`), { headers }),
    await page.request.post(mythosCreaturesApiUrl(API_ORIGIN, campaignId, `/${humanNpcId}/duplicate`), { headers }),
  ]
  expect(responses.map((response) => response.status())).toEqual([404, 404, 404, 404, 404, 404, 404])
}
