import { randomUUID } from 'node:crypto'

import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { campaignNav } from '../fixtures/overview'
import { createScenarioViaUi } from '../fixtures/scenarios'
import {
  createSceneViaUi,
  formattingButton,
  keeperNotesEditor,
  sceneIdFromUrl,
  sceneLinks,
  sceneLocationField,
  scenesApiUrl,
  scenesSection,
  sceneTitleField,
  submitSceneForm,
} from '../fixtures/scenes'

/**
 * Traces to specs/scenario-preparation/spec.md Scenarios "Keeper prepares a Scene", "Keeper reorders the Scenes",
 * "Keeper removes a Prepared Scene", "Scenes are the Keeper's alone", and "Scene Keeper notes outside the allowed nodes
 * are refused", and to specs/scenario-preparation/ux.md SP-UX-15 to SP-UX-27.
 *
 * Exception: "A played Scene cannot be removed", "A Finished Scene is read-only", "The Keeper edits an Active Scene's
 * Keeper notes", and the Active and Finished parts of SP-UX-21 to SP-UX-23 cannot be reached end to end, because no
 * endpoint starts or finishes a Scene until PBI-SPL-001 and the harness has no database seeding. Domain, service,
 * integration (seeded), and component tests cover them; PBI-SPL-001 adds them here.
 */
test.describe('Scenes', () => {
  test('Keeper prepares, reorders, edits, and removes Scenes', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Scenes ${keeper.oid.slice(0, 6)}`)
    const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
    const scenarioUrl = `/campaigns/${campaignId}/scenarios/${scenarioId}`

    await test.step('SP-UX-15: a Scenario with no Scene says so and offers Create Scene', async () => {
      await page.goto(scenarioUrl)
      await expect(scenesSection(page).getByRole('heading', { level: 2, name: 'Scenes' })).toBeVisible()
      await expect(scenesSection(page).getByText('No Scenes yet.')).toBeVisible()
      await scenesSection(page).getByRole('link', { name: 'Create Scene' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Create Scene' })).toBeVisible()
      await expect(page.getByText('Scenario: The Haunting')).toBeVisible()
    })

    await test.step('SP-UX-17: submitting an empty title explains it, focuses Title, and saves nothing', async () => {
      await page.getByRole('button', { name: 'Create Scene' }).click()
      await expect(page.getByText('Enter a title.')).toBeVisible()
      await expect(sceneTitleField(page)).toBeFocused()
      await expect(page).toHaveURL(new RegExp(`/scenes/new$`))
    })

    await test.step('SP-UX-16, SP-UX-21, SP-UX-25: a valid title and location open the new Scene as Prepared under the Overview tab', async () => {
      await submitSceneForm(page, 'The Corbitt House', 'Arkham, Boston Road')
      await expect(page.getByRole('status').filter({ hasText: 'Scene created.' })).toBeVisible()
      await expect(page.getByText('Prepared', { exact: true })).toBeVisible()
      await expect(page.getByText('Arkham, Boston Road')).toBeVisible()
      await expect(page.getByText('No Keeper notes yet.')).toBeVisible()
      await expect(campaignNav(page).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    })

    await test.step('SP-UX-16: the new Scene is listed last as Prepared on the Scenario page', async () => {
      await createSceneViaUi(page, campaignId, scenarioId, 'Meeting Knott')
      await page.getByRole('link', { name: 'Back to the Scenario' }).click()
      await expect(sceneLinks(page)).toHaveText(['The Corbitt House', 'Meeting Knott'])
      await expect(scenesSection(page).getByText('Prepared', { exact: true })).toHaveCount(2)
    })

    await test.step('SP-UX-24: moving "Meeting Knott" up reorders the list, announces it, and keeps focus; the order survives a reload', async () => {
      await scenesSection(page).getByRole('button', { name: 'Move Meeting Knott up' }).click()
      await expect(sceneLinks(page)).toHaveText(['Meeting Knott', 'The Corbitt House'])
      await expect(scenesSection(page).getByRole('status')).toHaveText('Meeting Knott moved to position 1 of 2.')
      await expect(scenesSection(page).getByRole('button', { name: 'Move Meeting Knott down' })).toBeFocused()
      await page.reload()
      await expect(sceneLinks(page)).toHaveText(['Meeting Knott', 'The Corbitt House'])
    })

    await test.step('SP-UX-20: Edit then Save stores the changes, shows "Scene saved.", and survives a reload; Cancel discards', async () => {
      await sceneLinks(page).filter({ hasText: 'The Corbitt House' }).click()
      await page.getByRole('button', { name: 'Edit' }).click()
      await expect(sceneTitleField(page)).toBeFocused()
      await sceneTitleField(page).fill('Discarded title')
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit' })).toBeFocused()

      await page.getByRole('button', { name: 'Edit' }).click()
      await sceneTitleField(page).fill('The Corbitt Cellar')
      await sceneLocationField(page).fill('Arkham, Boston Road, cellar')
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Scene saved.' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit' })).toBeFocused()
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt Cellar' })).toBeVisible()
      await expect(page.getByText('Arkham, Boston Road, cellar')).toBeVisible()
    })

    await test.step('SP-UX-23: Cancel in the remove dialog keeps the Scene', async () => {
      await page.getByRole('button', { name: 'Remove Scene' }).click()
      await expect(page.getByRole('alertdialog', { name: 'Remove The Corbitt Cellar?' })).toBeVisible()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Remove Scene' })).toBeFocused()
    })

    await test.step('SP-UX-23: confirming returns to the Scenario page with "Scene removed." and without the Scene', async () => {
      await page.getByRole('button', { name: 'Remove Scene' }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Remove Scene' }).click()
      await expect(page).toHaveURL(new RegExp(`${scenarioUrl}$`))
      await expect(page.getByRole('status').filter({ hasText: 'Scene removed.' })).toBeVisible()
      await expect(sceneLinks(page)).toHaveText(['Meeting Knott'])
    })
  })

  test('Keeper formats Keeper notes and links open safely', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Notes ${keeper.oid.slice(0, 6)}`)
    const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
    await page.goto(`/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/new`)
    await sceneTitleField(page).fill('The Corbitt House')
    const editor = keeperNotesEditor(page)

    await test.step('SP-UX-18: Heading, Bold, Bulleted list, and a Link applied in the editor', async () => {
      await editor.click()
      await formattingButton(page, 'Heading').click()
      await page.keyboard.type('The cellar')
      await page.keyboard.press('Enter')
      await page.keyboard.type('The key is ')
      await formattingButton(page, 'Bold').click()
      await page.keyboard.type('under the stairs')
      await formattingButton(page, 'Bold').click()
      await page.keyboard.press('Enter')
      await formattingButton(page, 'Bulleted list').click()
      await page.keyboard.type('Check the pantry')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Check the attic')
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Read more at ')
    })

    await test.step('SP-UX-19: the link dialog refuses a javascript: address, then accepts an https one', async () => {
      await formattingButton(page, 'Link').click()
      const dialog = page.getByRole('dialog', { name: 'Add link' })
      await expect(dialog.getByRole('textbox', { name: 'Web address' })).toBeFocused()
      await dialog.getByRole('textbox', { name: 'Web address' }).fill('javascript:alert(1)')
      await dialog.getByRole('button', { name: 'Save link' }).click()
      await expect(dialog.getByText('Enter a web address that starts with http:// or https://.')).toBeVisible()

      await dialog.getByRole('textbox', { name: 'Web address' }).fill('https://example.com/corbitt')
      await dialog.getByRole('button', { name: 'Save link' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(editor).toBeFocused()
    })

    await test.step('SP-UX-18, SP-UX-19: after saving and a reload, the Scene page shows the formatting and a safe link', async () => {
      await page.getByRole('button', { name: 'Create Scene' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
      await page.reload()
      const notes = page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: 'Keeper notes' }) })
      await expect(notes.getByRole('heading', { level: 3, name: 'The cellar' })).toBeVisible()
      await expect(notes.locator('strong')).toHaveText('under the stairs')
      await expect(notes.getByRole('listitem')).toHaveText(['Check the pantry', 'Check the attic'])
      const link = notes.getByRole('link', { name: 'https://example.com/corbitt' })
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  test("Scenes are the Keeper's alone", async ({ page, browser }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Private ${keeper.oid.slice(0, 6)}`)
    const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
    const otherScenarioId = await createScenarioViaUi(page, campaignId, 'Edge of Darkness')
    const sceneId = await createSceneViaUi(page, campaignId, scenarioId, 'Secret scene', 'Secret place')
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, campaignId))
    const otherKeeper = await signInNewContext(browser, newAccount('Keeper'))
    const scenarioPath = `/campaigns/${campaignId}/scenarios/${scenarioId}`

    try {
      await test.step("SP-UX-26: the Player's Scene URL shows not found and the create URL shows the Scenario not found", async () => {
        await player.page.goto(`${scenarioPath}/scenes/${sceneId}`)
        await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeVisible()
        await player.page.goto(`${scenarioPath}/scenes/new`)
        await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeVisible()
        await expect(player.page.getByText('Secret scene')).toHaveCount(0)
      })

      await test.step("the Player's bearer gets 404 on all six endpoints", async () => {
        const bearer = await openAndCaptureBearer(player.page, `/campaigns/${campaignId}`)
        await expectAllNotFound(player.page, bearer, campaignId, scenarioId, sceneId)
      })

      await test.step("another Keeper's bearer gets 404 on all six endpoints, and the UI shows not found", async () => {
        const bearer = await openAndCaptureBearer(otherKeeper.page, '/campaigns')
        await expectAllNotFound(otherKeeper.page, bearer, campaignId, scenarioId, sceneId)
        await otherKeeper.page.goto(`${scenarioPath}/scenes/${sceneId}`)
        await expect(otherKeeper.page.getByRole('heading', { name: "We couldn't find that Campaign" })).toBeVisible()
        await expect(otherKeeper.page.getByText('Secret scene')).toHaveCount(0)
      })

      await test.step("SP-UX-26: a Scene id under another Scenario of the same Keeper shows 'We couldn't find that Scene'", async () => {
        await page.goto(`/campaigns/${campaignId}/scenarios/${otherScenarioId}/scenes/${sceneId}`)
        await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeVisible()
        await expect(page.getByText('Secret scene')).toHaveCount(0)
      })
    } finally {
      await player.context.close()
      await otherKeeper.context.close()
    }
  })

  test('Scene Keeper notes outside the allowed nodes are refused', async ({ page }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)
    const campaignId = await createCampaignViaUi(page, `Refused ${keeper.oid.slice(0, 6)}`)
    const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
    const sceneId = await createSceneViaUi(page, campaignId, scenarioId, 'The Corbitt House')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}`)
    const headers = { Authorization: bearer }
    const imageNotes = { root: { type: 'root', children: [{ type: 'image', src: 'https://example.com/a.png' }] } }
    const scriptLinkNotes = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'link',
                url: 'javascript:alert(1)',
                target: '_blank',
                rel: 'noopener noreferrer',
                children: [{ type: 'text', text: 'x' }],
              },
            ],
          },
        ],
      },
    }

    await test.step('SP-UX-18: a save with an image node or a javascript: link is refused with 400 and the Scene is unchanged', async () => {
      for (const keeperNotes of [imageNotes, scriptLinkNotes]) {
        const created = await page.request.post(scenesApiUrl(API_ORIGIN, campaignId, scenarioId), {
          headers,
          data: { title: 'Refused', keeperNotes },
        })
        const edited = await page.request.put(scenesApiUrl(API_ORIGIN, campaignId, scenarioId, `/${sceneId}`), {
          headers,
          data: { title: 'Changed', keeperNotes },
        })
        expect([created.status(), edited.status()]).toEqual([400, 400])
      }

      await page.goto(`/campaigns/${campaignId}/scenarios/${scenarioId}`)
      await expect(sceneLinks(page)).toHaveText(['The Corbitt House'])
      await page.goto(`/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}`)
      await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
      expect(sceneIdFromUrl(page)).toBe(sceneId)
    })
  })
})

/** Calls every Scene endpoint with this bearer and expects 404 from each. */
async function expectAllNotFound(page: Page, bearer: string, campaignId: string, scenarioId: string, sceneId: string): Promise<void> {
  const headers = { Authorization: bearer }
  const body = { title: 'Mine' }
  const responses = {
    list: await page.request.get(scenesApiUrl(API_ORIGIN, campaignId, scenarioId), { headers }),
    create: await page.request.post(scenesApiUrl(API_ORIGIN, campaignId, scenarioId), { headers, data: body }),
    get: await page.request.get(scenesApiUrl(API_ORIGIN, campaignId, scenarioId, `/${sceneId}`), { headers }),
    edit: await page.request.put(scenesApiUrl(API_ORIGIN, campaignId, scenarioId, `/${sceneId}`), { headers, data: body }),
    remove: await page.request.delete(scenesApiUrl(API_ORIGIN, campaignId, scenarioId, `/${sceneId}`), { headers }),
    reorder: await page.request.put(scenesApiUrl(API_ORIGIN, campaignId, scenarioId, '/order'), {
      headers,
      data: { sceneIds: [sceneId, randomUUID()] },
    }),
  }
  const statuses = Object.fromEntries(Object.entries(responses).map(([name, response]) => [name, response.status()]))
  expect(statuses, 'every Scene endpoint answers 404 to a non-Keeper').toEqual({
    list: 404,
    create: 404,
    get: 404,
    edit: 404,
    remove: 404,
    reorder: 404,
  })
}
