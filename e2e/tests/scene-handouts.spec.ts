import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { campaignNav } from '../fixtures/overview'
import { createScenarioViaUi } from '../fixtures/scenarios'
import {
  addHandoutViaUi,
  fillHandoutForm,
  handoutLinks,
  handoutSection,
  handoutSubmitButton,
  handoutTextEditor,
  handoutTitleField,
  handoutsApiUrl,
  kindRadio,
  openAddHandoutPage,
  textDocument,
  visibilityRadio,
} from '../fixtures/scene-handouts'
import { createSceneViaUi, formattingButton } from '../fixtures/scenes'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Read-aloud passages are separate Handouts", "Keeper edits,
 * reorders, and deletes Handouts", "A Handout needs an explicit visibility", "Rich text outside the allowed nodes is
 * refused" (the link dialog's part), and "Handouts are the Keeper's alone", and to specs/scenario-preparation/ux.md
 * SP-UX-64 to SP-UX-71, SP-UX-74 to SP-UX-76 and SP-A11Y-37 to SP-A11Y-41.
 *
 * Exceptions: Active and Finished Scenes cannot be reached end to end until PBI-SPL-001 (ux.md section 49) and the harness
 * has no database seeding, so SP-UX-72, SP-UX-73, "The Keeper edits an Active Scene" (adding a Text Handout), the Handout
 * part of "A Finished Scene is read-only", and "A Handout on an Active Scene cannot be deleted" are covered by the seeded
 * integration tests (HandoutApiTests) and by component tests. The 400 for an image node or a javascript: link is an
 * integration test, because the editor cannot produce either; here the link dialog's refusal is checked instead. The
 * over-204,800-byte text and the double activation of SP-UX-75 are covered by component tests, where an end-to-end run
 * would only repeat them slowly.
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

/** Adds a Handout through the API as the signed-in Keeper, so the journey under test can start from it. */
async function addHandoutViaApi(
  page: Page,
  bearer: string,
  scene: SceneSetup,
  handout: { title: string; kind: 'ReadAloud' | 'Text'; visibility: 'PlayerFacing' | 'KeeperFacing'; text: string },
): Promise<string> {
  const response = await page.request.post(handoutsApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId), {
    headers: { Authorization: bearer },
    data: { kind: handout.kind, visibility: handout.visibility, title: handout.title, content: textDocument(handout.text) },
  })
  expect(response.status(), 'POST handouts').toBe(201)
  return ((await response.json()) as { id: string }).id
}

test.describe('Scene Handouts', () => {
  test('Keeper adds Read-aloud passages as separate Handouts', async ({ page }) => {
    const scene = await prepareScene(page, 'Read-aloud')
    await openScene(page, scene)

    await test.step('SP-UX-64: the Scene page lists no Handouts yet and offers to add one', async () => {
      await expect(handoutSection(page).getByRole('heading', { level: 2, name: 'Handouts' })).toBeVisible()
      await expect(handoutSection(page).getByText('No Handouts yet.')).toBeVisible()
      await expect(
        handoutSection(page).getByText('Player-facing Handouts reach Players only when you reveal them. Keeper-facing Handouts are never revealed.'),
      ).toBeVisible()
    })

    await test.step('SP-UX-67, SP-UX-76: the add page preselects neither a kind nor a visibility and keeps Overview current', async () => {
      await openAddHandoutPage(page)
      await expect(page.getByText('Scene: The Corbitt House')).toBeVisible()
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })

    await test.step('SP-UX-65, SP-UX-75: a valid submit disables the button while it is in flight, then returns to the Scene page with "{title} added."', async () => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      await page.route('**/handouts', async (route) => {
        if (route.request().method() === 'POST') {
          await gate
        }
        await route.continue()
      })

      await handoutTitleField(page).fill('The front door')
      await kindRadio(page, 'Read-aloud').click()
      await visibilityRadio(page, 'Player-facing').click()
      await handoutTextEditor(page).click()
      await formattingButton(page, 'Bold').click()
      await page.keyboard.type('A cold draught')
      await formattingButton(page, 'Bold').click()
      await page.keyboard.type(' greets you.')
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByRole('button', { name: 'Adding...' })).toBeDisabled()

      release()
      await expect(page.getByRole('status').filter({ hasText: 'The front door added.' })).toBeVisible()
      await page.unroute('**/handouts')
      await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
      await expect(handoutLinks(page)).toHaveText(['The front door'])
      await expect(handoutLinks(page)).toBeFocused()
    })

    await test.step('SP-UX-65: a second Read-aloud Handout with the other visibility is listed after the first', async () => {
      await openAddHandoutPage(page)
      await addHandoutViaUi(page, { title: 'The secret door', kind: 'Read-aloud', visibility: 'Keeper-facing', text: 'A seam in the wall.' })
      await expect(handoutLinks(page)).toHaveText(['The front door', 'The secret door'])
    })

    await test.step('SP-UX-64, SP-UX-67: each Handout shows its kind and its visibility as text', async () => {
      const items = handoutSection(page).getByRole('listitem')
      await expect(items.filter({ hasText: 'The front door' })).toContainText('Read-aloud')
      await expect(items.filter({ hasText: 'The front door' })).toContainText('Player-facing')
      await expect(items.filter({ hasText: 'The secret door' })).toContainText('Read-aloud')
      await expect(items.filter({ hasText: 'The secret door' })).toContainText('Keeper-facing')
    })

    await test.step('SP-UX-65, SP-UX-68: the Handout page shows its text and formatting in the Read-aloud panel after a reload', async () => {
      await handoutLinks(page).filter({ hasText: 'The front door' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'The front door' })).toBeVisible()
      await page.reload()
      const panel = page.getByRole('region', { name: 'Read-aloud' })
      await expect(panel.getByRole('heading', { level: 2, name: 'Read-aloud' })).toBeVisible()
      await expect(panel.locator('strong')).toHaveText('A cold draught')
      await expect(panel.getByText('greets you.')).toBeVisible()
      await expect(page.getByText('Scene: The Corbitt House')).toBeVisible()
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })

    await test.step('the way back returns to the Scene page, which still lists both Handouts', async () => {
      await page.getByRole('link', { name: 'Back to the Scene' }).click()
      await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
      await expect(handoutLinks(page)).toHaveText(['The front door', 'The secret door'])
    })
  })

  test('Keeper edits, reorders, and deletes Handouts', async ({ page }) => {
    const scene = await prepareScene(page, 'Handout upkeep')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    await addHandoutViaApi(page, bearer, scene, { title: 'The front door', kind: 'ReadAloud', visibility: 'PlayerFacing', text: 'You stand before it.' })
    const letterId = await addHandoutViaApi(page, bearer, scene, {
      title: 'A letter',
      kind: 'Text',
      visibility: 'KeeperFacing',
      text: 'My dear friend.',
    })
    await addHandoutViaApi(page, bearer, scene, { title: 'The cellar', kind: 'Text', visibility: 'PlayerFacing', text: 'Damp stairs.' })
    await openScene(page, scene)
    const handoutPath = `${scene.scenePath}/handouts/${letterId}`

    await test.step('SP-UX-70: moving "The cellar" up reorders the list, announces it, and keeps focus; the order survives a reload', async () => {
      await expect(handoutLinks(page)).toHaveText(['The front door', 'A letter', 'The cellar'])
      await handoutSection(page).getByRole('button', { name: 'Move The cellar up' }).click()
      await expect(handoutLinks(page)).toHaveText(['The front door', 'The cellar', 'A letter'])
      await expect(handoutSection(page).getByRole('status')).toHaveText('The cellar moved to position 2 of 3.')
      await expect(handoutSection(page).getByRole('button', { name: 'Move The cellar up' })).toBeFocused()
      await page.reload()
      await expect(handoutLinks(page)).toHaveText(['The front door', 'The cellar', 'A letter'])
    })

    await test.step('SP-UX-70: moving "The front door" down swaps it with the next Handout', async () => {
      await handoutSection(page).getByRole('button', { name: 'Move The front door down' }).click()
      await expect(handoutLinks(page)).toHaveText(['The cellar', 'The front door', 'A letter'])
      await expect(handoutSection(page).getByRole('status')).toHaveText('The front door moved to position 2 of 3.')
    })

    await test.step('SP-UX-69: Edit opens the form prefilled and Cancel discards the changes, returning focus to Edit', async () => {
      await handoutLinks(page).filter({ hasText: 'A letter' }).click()
      await expect(page).toHaveURL(new RegExp(`${handoutPath}$`))
      await expect(page.getByRole('heading', { level: 1, name: 'A letter' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Text' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Read-aloud' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await expect(handoutTitleField(page)).toBeFocused()
      await expect(handoutTitleField(page)).toHaveValue('A letter')
      await expect(kindRadio(page, 'Text')).toBeChecked()
      await expect(visibilityRadio(page, 'Keeper-facing')).toBeChecked()
      await handoutTitleField(page).fill('Discarded title')
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'A letter' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
    })

    await test.step('SP-UX-69, SP-UX-75: Save stores a new title, the other kind, and the other visibility, says "Handout saved.", and survives a reload', async () => {
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await handoutTitleField(page).fill('Corbitt letter')
      await kindRadio(page, 'Read-aloud').click()
      await visibilityRadio(page, 'Player-facing').click()
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Handout saved.' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeFocused()
      await expect(page.getByRole('region', { name: 'Read-aloud' })).toContainText('My dear friend.')
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Corbitt letter' })).toBeVisible()
      await expect(page.getByRole('region', { name: 'Read-aloud' })).toContainText('My dear friend.')
      await expect(page.getByText('Player-facing')).toBeVisible()
    })

    await test.step('SP-UX-71: Delete Handout asks first, and Cancel keeps the Handout and returns focus to the button', async () => {
      await page.getByRole('button', { name: 'Delete Handout' }).click()
      await expect(page.getByRole('alertdialog', { name: 'Delete Corbitt letter?' })).toContainText("This can't be undone.")
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Delete Handout' })).toBeFocused()
    })

    await test.step('SP-UX-71, SP-A11Y-40: confirming returns to the Scene page with "{title} deleted.", focus on the Handouts heading, and without the Handout', async () => {
      await page.getByRole('button', { name: 'Delete Handout' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete Handout' }).click()
      await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
      await expect(page.getByRole('status').filter({ hasText: 'Corbitt letter deleted.' })).toBeVisible()
      await expect(handoutLinks(page)).toHaveText(['The cellar', 'The front door'])
      await expect(handoutSection(page).getByRole('heading', { level: 2, name: 'Handouts' })).toBeFocused()
    })
  })

  test('Keeper is told what a Handout still needs', async ({ page }) => {
    const scene = await prepareScene(page, 'Handout validation')
    await openScene(page, scene)
    await openAddHandoutPage(page)

    await test.step('SP-UX-66: submitting the empty form explains every field and focuses the title', async () => {
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('Enter a title.')).toBeVisible()
      await expect(page.getByText('Choose Read-aloud or Text.')).toBeVisible()
      await expect(page.getByText('Choose who can see this Handout.')).toBeVisible()
      await expect(page.getByText('Enter the Handout text.')).toBeVisible()
      await expect(handoutTitleField(page)).toBeFocused()
    })

    await test.step('SP-UX-66: a title over 200 characters is explained and nothing is saved', async () => {
      await handoutTitleField(page).fill('t'.repeat(201))
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('Title must be 200 characters or fewer.')).toBeVisible()
      await expect(handoutTitleField(page)).toBeFocused()
    })

    await test.step('SP-UX-66, SP-UX-67: with a title but no kind, the kind is explained and its first radio is focused', async () => {
      await handoutTitleField(page).fill('The front door')
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('Choose Read-aloud or Text.')).toBeVisible()
      await expect(kindRadio(page, 'Read-aloud')).toBeFocused()
    })

    await test.step('SP-UX-66, SP-UX-67: with a kind but no visibility, the visibility is explained and its first radio is focused', async () => {
      await kindRadio(page, 'Read-aloud').click()
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('Choose who can see this Handout.')).toBeVisible()
      await expect(visibilityRadio(page, 'Player-facing')).toBeFocused()
    })

    await test.step('SP-UX-66: with a visibility but no text, the text is explained and focused', async () => {
      await visibilityRadio(page, 'Player-facing').click()
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('Enter the Handout text.')).toBeVisible()
      await expect(handoutTextEditor(page)).toBeFocused()
    })

    await test.step('SP-UX-66: text of only spaces counts as no text', async () => {
      await page.keyboard.type('   ')
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('Enter the Handout text.')).toBeVisible()
      await expect(handoutTextEditor(page)).toBeFocused()
    })

    await test.step('SP-UX-19: the link dialog refuses an address that is not http or https, so no javascript: link is entered', async () => {
      await formattingButton(page, 'Link').click()
      const dialog = page.getByRole('dialog', { name: 'Add link' })
      await dialog.getByRole('textbox', { name: 'Web address' }).fill('javascript:alert(1)')
      await dialog.getByRole('button', { name: 'Save link' }).click()
      await expect(dialog.getByText('Enter a web address that starts with http:// or https://.')).toBeVisible()
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toHaveCount(0)
    })

    await test.step('nothing was saved: the Scene still lists no Handouts', async () => {
      await openScene(page, scene)
      await expect(handoutSection(page).getByText('No Handouts yet.')).toBeVisible()
    })
  })

  test("Handouts are the Keeper's alone", async ({ page, browser }) => {
    const scene = await prepareScene(page, 'Handout boundaries')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const secret = 'The cultist hides the key under the stairs'
    const handoutId = await addHandoutViaApi(page, bearer, scene, { title: 'The secret', kind: 'Text', visibility: 'KeeperFacing', text: secret })
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, scene.campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))
    const handoutPath = `${scene.scenePath}/handouts/${handoutId}`
    const addPath = `${scene.scenePath}/handouts/new`

    try {
      await test.step('SP-UX-74: the Player sees "We couldn\'t find that Scene" on the Handout and add pages, and no Handout text', async () => {
        for (const path of [handoutPath, addPath]) {
          await player.page.goto(path)
          await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeVisible()
          await expect(player.page.getByText(secret)).toHaveCount(0)
          await expect(player.page.getByText('The secret')).toHaveCount(0)
        }
      })

      await test.step("the Player's bearer and another Keeper's bearer get 404 on every Handout endpoint", async () => {
        const players = await openAndCaptureBearer(player.page, `/campaigns/${scene.campaignId}`)
        const others = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        for (const [actor, token] of [[player.page, players], [otherKeeper.page, others]] as const) {
          await expectAllNotFound(actor, token, scene, handoutId)
        }
      })

      await test.step('SP-UX-74: an unknown Handout id shows "We couldn\'t find that Handout" for the Keeper', async () => {
        await page.goto(`${scene.scenePath}/handouts/00000000-0000-0000-0000-000000000000`)
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Handout" })).toBeVisible()
        await page.getByRole('link', { name: 'Back to the Scene' }).click()
        await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
        await expect(handoutLinks(page)).toHaveText(['The secret'])
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })
})

async function expectAllNotFound(page: Page, bearer: string, scene: SceneSetup, handoutId: string): Promise<void> {
  const headers = { Authorization: bearer }
  const base = handoutsApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId)
  const body = { kind: 'Text', visibility: 'KeeperFacing', title: 'Intruder', content: textDocument('Intruder') }
  const responses = [
    await page.request.get(`${base}/${handoutId}`, { headers }),
    await page.request.post(base, { headers, data: body }),
    await page.request.put(`${base}/${handoutId}`, { headers, data: body }),
    await page.request.delete(`${base}/${handoutId}`, { headers }),
    await page.request.put(`${base}/order`, { headers, data: { handoutIds: [handoutId] } }),
  ]
  expect(responses.map((response) => response.status())).toEqual([404, 404, 404, 404, 404])
}
