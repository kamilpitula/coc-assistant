import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { createHumanNpcViaUi, createMythosCreatureViaUi, mythosCreaturesApiUrl, nonPlayerEntityLinks } from '../fixtures/non-player-entities'
import { createScenarioViaUi } from '../fixtures/scenarios'
import {
  linkEntityViaUi,
  linkHeadings,
  linkSection,
  linksApiUrl,
  openLinkPage,
  picker,
  playerFacingDescriptionEditor,
  playerFacingNameField,
  submitButton,
} from '../fixtures/scene-links'
import { createSceneViaUi, formattingButton } from '../fixtures/scenes'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Keeper links a Mythos Creature to a Scene", "Keeper edits and
 * unlinks a Non-Player Entity link", "A Non-Player Entity can be linked to a Scene twice", "Deleting a profile linked only
 * to Prepared Scenes removes its links", "Keeper duplicates a profile" (a copy is linked to no Scene), "Keeper deletes an
 * unlinked profile" (the dialog warning), and "Campaign boundaries isolate Scenario material", and to
 * specs/scenario-preparation/ux.md SP-UX-50 to SP-UX-56, SP-UX-58 (Prepared part), SP-UX-59, SP-UX-60, SP-UX-62, SP-UX-63
 * and SP-A11Y-33.
 *
 * Exceptions: Active and Finished Scenes cannot be seeded end to end until PBI-SPL-001 (ux.md section 20), so "Material a
 * played Scene refers to cannot be deleted", the link part of "A Finished Scene is read-only", SP-UX-57, and the
 * refused-dialog part of SP-UX-58 are covered by the seeded integration tests (NonPlayerEntityLinkApiTests) and by
 * component tests. The over-204,800-byte description of SP-UX-53 and the double activation of SP-UX-61 are covered by
 * component tests, where an end-to-end run would only repeat them slowly.
 */

interface SceneSetup {
  campaignId: string
  scenarioId: string
  sceneId: string
  scenePath: string
}

async function openScene(page: Page, scene: SceneSetup): Promise<void> {
  await page.goto(scene.scenePath)
  await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
}

/** Creates a Campaign, a Scenario, and a Prepared Scene "The Corbitt House" as a new Keeper. */
async function prepareScene(page: Page, label: string): Promise<SceneSetup> {
  const keeper = newAccount('Keeper')
  await signIn(page, keeper)
  const campaignId = await createCampaignViaUi(page, `${label} ${keeper.oid.slice(0, 6)}`)
  const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
  const sceneId = await createSceneViaUi(page, campaignId, scenarioId, 'The Corbitt House')
  return { campaignId, scenarioId, sceneId, scenePath: `/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}` }
}

/** Links an entity through the API as the signed-in Keeper, so the journey under test can start from a link. */
async function linkViaApi(page: Page, bearer: string, scene: SceneSetup, type: string, id: string, playerFacingName: string): Promise<string> {
  const response = await page.request.post(linksApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId), {
    headers: { Authorization: bearer },
    data: { nonPlayerEntity: { type, id }, playerFacingName, playerFacingDescription: null },
  })
  expect(response.status(), 'POST non-player-entity-links').toBe(201)
  return ((await response.json()) as { id: string }).id
}

const ghoulProfile = {
  name: 'Ghoul',
  details: { creatureKind: 'mythos' },
  combat: {
    attacksPerRound: 3,
    dodge: 30,
    attacks: [{ name: 'Claw', skill: 'Fighting', skillValue: 40, damage: '1D6+DB', effect: null, manoeuvre: false }],
  },
  characteristics: {
    values: { STR: 80, CON: 60, SIZ: 60, DEX: 60, INT: 60, POW: 60 },
    hitPointsNotApplicable: false,
    overrides: null,
  },
  defenses: { armorPoints: 2, armorNote: null, immunities: [], vulnerabilities: [] },
  powers: [{ name: 'Drain', magicPointCost: null, effect: null, limits: 'Once per day' }],
  sanityLoss: { value: '0/1D6' },
}

test.describe('Scene links', () => {
  test('Keeper links a Mythos Creature to a Scene and finds its profile unchanged', async ({ page }) => {
    const scene = await prepareScene(page, 'Links')
    await createHumanNpcViaUi(page, scene.campaignId, 'Mr. Knott', '62')
    const ghoulId = await createMythosCreatureViaUi(page, scene.campaignId, 'Ghoul')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const saved = await page.request.put(mythosCreaturesApiUrl(API_ORIGIN, scene.campaignId, `/${ghoulId}`), {
      headers: { Authorization: bearer },
      data: ghoulProfile,
    })
    expect(saved.ok(), 'PUT mythos-creatures').toBe(true)

    await test.step('SP-UX-50: the Scene page lists no links yet and offers to link one', async () => {
      await openScene(page, scene)
      await expect(linkSection(page).getByRole('heading', { level: 2, name: 'Non-Player Entities' })).toBeVisible()
      await expect(linkSection(page).getByText('No Non-Player Entities linked yet.')).toBeVisible()
      await expect(linkSection(page).getByText('Only the Player-facing name and description can reach Players, and only when you reveal them.')).toBeVisible()
    })

    await test.step("SP-UX-51: the picker offers this Campaign's entities, narrows by search and type, and restores with Clear filters", async () => {
      await openLinkPage(page)
      await expect(page.getByText('Scene: The Corbitt House')).toBeVisible()
      const choices = picker(page).getByRole('radiogroup', { name: 'Non-Player Entities' }).getByRole('radio')
      await expect(choices).toHaveCount(2)

      await picker(page).getByLabel('Search by name').fill('gho')
      await expect(page.getByText('1 shown.')).toBeVisible()
      await expect(choices).toHaveCount(1)
      await picker(page).getByLabel('Search by name').fill('zzz')
      await expect(picker(page).getByText('No Non-Player Entities match these filters.')).toBeVisible()
      await picker(page).getByRole('button', { name: 'Clear filters' }).click()
      await expect(picker(page).getByLabel('Search by name')).toBeFocused()
      await expect(choices).toHaveCount(2)

      await picker(page).getByRole('radio', { name: 'Human NPCs' }).click()
      await expect(choices).toHaveCount(1)
      await picker(page).getByRole('radio', { name: 'All', exact: true }).click()
      await expect(choices).toHaveCount(2)
    })

    await test.step('SP-UX-63: the Player-facing name starts empty, whatever the entity chosen', async () => {
      await picker(page).getByRole('radio', { name: 'Ghoul', exact: true }).click()
      await expect(picker(page).getByText('Selected: Ghoul, Mythos Creature')).toBeVisible()
      await expect(playerFacingNameField(page)).toHaveValue('')
    })

    await test.step('SP-UX-52: a name and a formatted description link the entity and return to the Scene page', async () => {
      await playerFacingNameField(page).fill('A shape in the cellar')
      await playerFacingDescriptionEditor(page).click()
      await formattingButton(page, 'Bold').click()
      await page.keyboard.type('Grey and wet')
      await formattingButton(page, 'Bold').click()
      await page.keyboard.type(' and very still.')
      await submitButton(page, 'Link').click()

      await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
      await expect(page.getByRole('status').filter({ hasText: 'A shape in the cellar linked.' })).toBeVisible()
      await expect(linkHeadings(page)).toHaveText(['A shape in the cellar'])
      await expect(linkHeadings(page)).toBeFocused()
      await expect(linkSection(page).getByText('Mythos Creature:')).toBeVisible()
      await expect(linkSection(page).locator('strong')).toHaveText('Grey and wet')
    })

    await test.step('SP-UX-52: the link and its formatting survive a reload', async () => {
      await page.reload()
      await expect(linkHeadings(page)).toHaveText(['A shape in the cellar'])
      await expect(linkSection(page).locator('strong')).toHaveText('Grey and wet')
      await expect(linkSection(page).getByText('and very still.')).toBeVisible()
    })

    await test.step('SP-UX-50: following the profile link shows the unchanged Monster Profile with its attacks, armor, Powers, and Sanity loss', async () => {
      await linkSection(page).getByRole('link', { name: 'Ghoul', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Ghoul' })).toBeVisible()
      await expect(page.getByRole('table', { name: 'Attacks' }).getByRole('row', { name: /Claw/ })).toContainText('Fighting 40%')
      await expect(page.getByRole('term').filter({ hasText: /^Armor points$/ })).toBeVisible()
      await expect(page.getByRole('definition').filter({ hasText: /^2$/ })).toBeVisible()
      await expect(page.getByText('Drain')).toBeVisible()
      await expect(page.getByText('Once per day')).toBeVisible()
      await expect(page.getByText('Sanity loss 0/1D6')).toBeVisible()
    })
  })

  test('Keeper edits and unlinks a Non-Player Entity link', async ({ page }) => {
    const scene = await prepareScene(page, 'Edit links')
    const ghoulId = await createMythosCreatureViaUi(page, scene.campaignId, 'Ghoul')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    await linkViaApi(page, bearer, scene, 'MythosCreature', ghoulId, 'A shape in the cellar')
    await openScene(page, scene)

    await test.step('SP-UX-55: Edit opens the link with the entity as text and the name prefilled, without a picker', async () => {
      await linkSection(page).getByRole('link', { name: 'Edit A shape in the cellar' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Edit A shape in the cellar' })).toBeVisible()
      await expect(page.getByText('Scene: The Corbitt House')).toBeVisible()
      await expect(page.getByText('Mythos Creature: Ghoul')).toBeVisible()
      await expect(picker(page)).toHaveCount(0)
      await expect(playerFacingNameField(page)).toHaveValue('A shape in the cellar')
    })

    await test.step('SP-UX-55: Cancel changes nothing', async () => {
      await playerFacingNameField(page).fill('Discarded name')
      await page.getByRole('link', { name: 'Cancel' }).click()
      await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
      await expect(linkHeadings(page)).toHaveText(['A shape in the cellar'])
    })

    await test.step('SP-UX-55: Save stores the change, says "{name} saved.", and focuses the link', async () => {
      await linkSection(page).getByRole('link', { name: 'Edit A shape in the cellar' }).click()
      await playerFacingNameField(page).fill('Something in the dark')
      await submitButton(page, 'Save').click()
      await expect(page.getByRole('status').filter({ hasText: 'Something in the dark saved.' })).toBeVisible()
      await expect(linkHeadings(page)).toHaveText(['Something in the dark'])
      await expect(linkHeadings(page)).toBeFocused()
    })

    await test.step('SP-UX-56: Unlink asks first, and Cancel keeps the link and returns focus to Unlink', async () => {
      await linkSection(page).getByRole('button', { name: 'Unlink Something in the dark' }).click()
      await expect(page.getByRole('alertdialog', { name: 'Unlink Something in the dark?' })).toBeVisible()
      await expect(page.getByRole('alertdialog')).toContainText('Its Player-facing name and description are deleted. Ghoul stays in the Campaign.')
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await expect(linkSection(page).getByRole('button', { name: 'Unlink Something in the dark' })).toBeFocused()
      await expect(linkHeadings(page)).toHaveText(['Something in the dark'])
    })

    await test.step('SP-UX-56, SP-A11Y-33: confirming removes the link, says "{name} unlinked.", and focuses the section heading; the profile stays', async () => {
      await linkSection(page).getByRole('button', { name: 'Unlink Something in the dark' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Unlink', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Something in the dark unlinked.' })).toBeVisible()
      await expect(linkSection(page).getByText('No Non-Player Entities linked yet.')).toBeVisible()
      await expect(linkSection(page).getByRole('heading', { level: 2, name: 'Non-Player Entities' })).toBeFocused()

      await page.goto(`/campaigns/${scene.campaignId}/non-player-entities`)
      await expect(nonPlayerEntityLinks(page)).toHaveText(['Ghoul'])
    })
  })

  test('Keeper links the same Non-Player Entity to a Scene twice', async ({ page }) => {
    const scene = await prepareScene(page, 'Twice')
    const knottId = await createHumanNpcViaUi(page, scene.campaignId, 'Mr. Knott', '62')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    await linkViaApi(page, bearer, scene, 'HumanNpc', knottId, 'A friendly landlord')
    await openScene(page, scene)

    await test.step('SP-UX-54: the linked entity is still offered, marked "Already in this Scene"', async () => {
      await openLinkPage(page)
      await expect(picker(page).getByRole('radio', { name: 'Mr. Knott', exact: true })).toHaveAccessibleDescription(/Already in this Scene/)
    })

    await test.step('SP-UX-54: linking it again adds a second link with its own Player-facing name', async () => {
      await linkEntityViaUi(page, 'Mr. Knott', 'A man with a key')
      await expect(linkHeadings(page)).toHaveText(['A friendly landlord', 'A man with a key'])
    })
  })

  test('Keeper is told what is missing from a link', async ({ page }) => {
    const scene = await prepareScene(page, 'Validation')
    await createMythosCreatureViaUi(page, scene.campaignId, 'Ghoul')
    await openScene(page, scene)
    await openLinkPage(page)

    await test.step('SP-UX-53: submitting without an entity says so and focuses the first radio', async () => {
      // The list loads after the page, and focus can only go to a radio once it is there.
      await expect(picker(page).getByRole('radio', { name: 'Ghoul', exact: true })).toBeVisible()
      await submitButton(page, 'Link').click()
      await expect(picker(page).getByText('Choose a Non-Player Entity.')).toBeVisible()
      await expect(picker(page).getByRole('radiogroup', { name: 'Non-Player Entities' }).getByRole('radio').first()).toBeFocused()
    })

    await test.step('SP-UX-53: with an entity but no name, the name is explained and focused', async () => {
      await picker(page).getByRole('radio', { name: 'Ghoul', exact: true }).click()
      await submitButton(page, 'Link').click()
      await expect(page.getByText('Enter a Player-facing name.')).toBeVisible()
      await expect(playerFacingNameField(page)).toBeFocused()
    })

    await test.step('SP-UX-53: a name over 200 characters is explained and nothing is saved', async () => {
      await playerFacingNameField(page).fill('n'.repeat(201))
      await submitButton(page, 'Link').click()
      await expect(page.getByText('Player-facing name must be 200 characters or fewer.')).toBeVisible()
      await expect(playerFacingNameField(page)).toBeFocused()
      await openScene(page, scene)
      await expect(linkSection(page).getByText('No Non-Player Entities linked yet.')).toBeVisible()
    })
  })

  test("Other Campaigns' entities are not offered and Players and other Keepers can't use the link pages", async ({ page, browser }) => {
    const scene = await prepareScene(page, 'Boundaries')
    const knottId = await createHumanNpcViaUi(page, scene.campaignId, 'Mr. Knott', '62')
    const otherCampaignId = await createCampaignViaUi(page, `Elsewhere ${scene.campaignId.slice(0, 6)}`)
    const elsewhereId = await createHumanNpcViaUi(page, otherCampaignId, 'Elsewhere NPC', '30')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const linkId = await linkViaApi(page, bearer, scene, 'HumanNpc', knottId, 'The landlord')
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, scene.campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))
    const newLinkPath = `${scene.scenePath}/non-player-entity-links/new`
    const editLinkPath = `${scene.scenePath}/non-player-entity-links/${linkId}`

    try {
      await test.step("SP-UX-51: the Campaign's own entities are offered and another Campaign's is not", async () => {
        await page.goto(newLinkPath)
        await expect(picker(page).getByRole('radio', { name: 'Mr. Knott', exact: true })).toBeVisible()
        await expect(picker(page).getByRole('radio', { name: 'Elsewhere NPC' })).toHaveCount(0)
      })

      await test.step('the API refuses an entity of another Campaign with a 400 keyed nonPlayerEntity', async () => {
        const response = await page.request.post(linksApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId), {
          headers: { Authorization: bearer },
          data: { nonPlayerEntity: { type: 'HumanNpc', id: elsewhereId }, playerFacingName: 'Smuggled', playerFacingDescription: null },
        })
        expect(response.status()).toBe(400)
        const body = (await response.json()) as { errors: Record<string, string[]> }
        expect(Object.keys(body.errors)).toEqual(['nonPlayerEntity'])
      })

      await test.step('SP-UX-60: the Player sees "We couldn\'t find that Scene" on both link pages and no link text', async () => {
        for (const path of [newLinkPath, editLinkPath]) {
          await player.page.goto(path)
          await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeVisible()
          await expect(player.page.getByText('The landlord')).toHaveCount(0)
        }
      })

      await test.step("the Player's bearer and another Keeper's bearer get 404 on every link endpoint", async () => {
        const players = await openAndCaptureBearer(player.page, `/campaigns/${scene.campaignId}`)
        const others = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        for (const [actor, token] of [[player.page, players], [otherKeeper.page, others]] as const) {
          const base = linksApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId)
          const responses = [
            await actor.request.post(base, { headers: { Authorization: token }, data: { nonPlayerEntity: { type: 'HumanNpc', id: knottId }, playerFacingName: 'X' } }),
            await actor.request.put(`${base}/${linkId}`, { headers: { Authorization: token }, data: { playerFacingName: 'X' } }),
            await actor.request.delete(`${base}/${linkId}`, { headers: { Authorization: token } }),
          ]
          expect(responses.map((response) => response.status())).toEqual([404, 404, 404])
        }
      })

      await test.step('SP-UX-60: an unknown link id shows "We couldn\'t find that link" for the Keeper', async () => {
        await page.goto(`${scene.scenePath}/non-player-entity-links/00000000-0000-0000-0000-000000000000`)
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that link" })).toBeVisible()
        await page.getByRole('link', { name: 'Back to the Scene' }).click()
        await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })

  test('Keeper with no Non-Player Entities is offered to create one', async ({ page }) => {
    const scene = await prepareScene(page, 'Empty picker')
    await openScene(page, scene)
    await openLinkPage(page)

    await test.step('SP-UX-62: the picker says there are none and links to Create Non-Player Entity', async () => {
      await expect(picker(page).getByText('No Non-Player Entities yet.')).toBeVisible()
      await expect(picker(page).getByLabel('Search by name')).toHaveCount(0)
      await picker(page).getByRole('link', { name: 'Create Non-Player Entity' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Create Non-Player Entity' })).toBeVisible()
    })
  })

  test('Deleting a profile linked only to Prepared Scenes removes its links', async ({ page }) => {
    const scene = await prepareScene(page, 'Cascade')
    const ghoulId = await createMythosCreatureViaUi(page, scene.campaignId, 'Ghoul')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    await linkViaApi(page, bearer, scene, 'MythosCreature', ghoulId, 'A shape in the cellar')

    await test.step('SP-UX-58: the Delete dialog warns that the profile is also removed from any Prepared Scene', async () => {
      await page.goto(`/campaigns/${scene.campaignId}/mythos-creatures/${ghoulId}`)
      await page.getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page.getByRole('alertdialog', { name: 'Delete Ghoul?' })).toContainText(
        "This can't be undone. It is also removed from any Prepared Scene it is part of.",
      )
    })

    await test.step('SP-UX-58: confirming deletes the profile and the Scene no longer lists it', async () => {
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Ghoul deleted.' })).toBeVisible()
      await openScene(page, scene)
      await expect(linkSection(page).getByText('No Non-Player Entities linked yet.')).toBeVisible()
      await expect(page.getByText('A shape in the cellar')).toHaveCount(0)
    })
  })

  test('Duplicating a linked profile makes a copy that is part of no Scene', async ({ page }) => {
    const scene = await prepareScene(page, 'Copy')
    const ghoulId = await createMythosCreatureViaUi(page, scene.campaignId, 'Ghoul')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    await linkViaApi(page, bearer, scene, 'MythosCreature', ghoulId, 'A shape in the cellar')

    await test.step('SP-UX-59: Duplicate opens the copy', async () => {
      await page.goto(`/campaigns/${scene.campaignId}/mythos-creatures/${ghoulId}`)
      await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Ghoul (copy)' })).toBeVisible()
      await expect(page.getByRole('status').filter({ hasText: "Copy created. It isn't part of any Scene." })).toBeVisible()
    })

    await test.step('SP-UX-59: the Scene still lists only the original link, never the copy', async () => {
      await openScene(page, scene)
      await expect(linkHeadings(page)).toHaveText(['A shape in the cellar'])
      await expect(linkSection(page).getByRole('link', { name: 'Ghoul', exact: true })).toBeVisible()
      await expect(linkSection(page).getByText('Ghoul (copy)')).toHaveCount(0)
    })
  })
})
