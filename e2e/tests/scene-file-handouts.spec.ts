import { test, expect, type Page } from '@playwright/test'

import { newAccount, signIn } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'
import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { createScenarioViaUi } from '../fixtures/scenarios'
import {
  PDF_BYTES,
  PNG_BYTES,
  chooseHandoutImage,
  fileField,
  handoutLinks,
  handoutSection,
  handoutSubmitButton,
  handoutTitleField,
  handoutsApiUrl,
  kindRadio,
  openAddHandoutPage,
  padded,
  visibilityRadio,
} from '../fixtures/scene-handouts'
import { createSceneViaUi } from '../fixtures/scenes'

/**
 * Traces to specs/scenario-preparation/spec.md Scenario "Keeper attaches a file Handout" and File storage, and to
 * specs/scenario-preparation/ux.md SP-UX-77 to SP-UX-89 and SP-A11Y-44 to SP-A11Y-50.
 *
 * Exceptions: Active and Finished Scenes cannot be reached end to end until PBI-SPL-001 (ux.md section 49), so the Active
 * (Replace keeps the old file, no Delete) and Finished parts of SP-UX-89 are covered by the seeded integration tests
 * (HandoutFileApiTests) and by component tests. Another Campaign's Keeper is covered at integration level, as for rich-text
 * Handouts. The real server-side storage failure is proven by the failing-store integration test; here the add request is
 * fulfilled with a 503.
 */

interface SceneSetup {
  campaignId: string
  scenarioId: string
  sceneId: string
  scenePath: string
}

async function prepareScene(page: Page, label: string): Promise<SceneSetup> {
  const keeper = newAccount('Keeper')
  await signIn(page, keeper)
  const campaignId = await createCampaignViaUi(page, `${label} ${keeper.oid.slice(0, 6)}`)
  const scenarioId = await createScenarioViaUi(page, campaignId, 'The Haunting')
  const sceneId = await createSceneViaUi(page, campaignId, scenarioId, 'The Corbitt House')
  return { campaignId, scenarioId, sceneId, scenePath: `/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}` }
}

async function openScene(page: Page, scene: SceneSetup): Promise<void> {
  await page.goto(scene.scenePath)
  await expect(page.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeVisible()
}

interface SeededFile {
  title: string
  kind: 'Image' | 'Document' | 'Map'
  name: string
  mimeType: string
  buffer: Buffer
}

/** Adds an Image, Document, or Map Handout through the API as the signed-in Keeper and returns its id. */
async function addFileHandoutViaApi(page: Page, bearer: string, scene: SceneSetup, file: SeededFile): Promise<string> {
  const response = await page.request.post(handoutsApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId), {
    headers: { Authorization: bearer },
    multipart: {
      kind: file.kind,
      visibility: 'PlayerFacing',
      title: file.title,
      file: { name: file.name, mimeType: file.mimeType, buffer: file.buffer },
    },
  })
  expect(response.status(), 'POST file handout').toBe(201)
  return ((await response.json()) as { id: string }).id
}

const planImage = (overrides: Partial<SeededFile> = {}): SeededFile => ({
  title: 'Corbitt House',
  kind: 'Image',
  name: 'corbitt-house.png',
  mimeType: 'image/png',
  buffer: PNG_BYTES,
  ...overrides,
})

const diaryPdf: SeededFile = { title: 'Diary', kind: 'Document', name: 'diary-page.pdf', mimeType: 'application/pdf', buffer: padded(PDF_BYTES, 2048) }

test.describe('Scene file Handouts', () => {
  test('Keeper attaches a Map with a PNG', async ({ page }) => {
    const scene = await prepareScene(page, 'Map')
    await openScene(page, scene)
    await openAddHandoutPage(page)

    await test.step('SP-UX-77: before a kind is chosen the content field is a placeholder, and no kind is preselected', async () => {
      await expect(page.getByText('Choose a kind to add its content.')).toBeVisible()
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
      await expect(fileField(page)).toHaveCount(0)
    })

    await test.step('SP-UX-77: choosing Map shows the image field with its hint, without moving focus', async () => {
      await kindRadio(page, 'Map').click()
      await expect(page.getByLabel('Image', { exact: true }).and(fileField(page))).toBeVisible()
      await expect(page.getByText('PNG, JPEG, WebP, or GIF, up to 20 MB.')).toBeVisible()
      await expect(kindRadio(page, 'Map')).toBeFocused()
    })

    await test.step('SP-UX-77: the chosen image is previewed with its name and size', async () => {
      await handoutTitleField(page).fill('Arkham')
      await visibilityRadio(page, 'Player-facing').click()
      await chooseHandoutImage(page, { name: 'arkham.png', buffer: PNG_BYTES })
      await expect(page.getByRole('img', { name: 'Preview of arkham.png' })).toBeVisible()
      await expect(page.getByText('arkham.png, 1 KB')).toBeVisible()
    })

    await test.step('SP-UX-78: submitting returns to the Scene page with "Arkham added." and lists the Map as Player-facing', async () => {
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByRole('status').filter({ hasText: 'Arkham added.' })).toBeVisible()
      await expect(handoutLinks(page)).toHaveText(['Arkham'])
      const item = handoutSection(page).getByRole('listitem').filter({ hasText: 'Arkham' })
      await expect(item).toContainText('Map')
      await expect(item).toContainText('Player-facing')
    })

    await test.step('SP-UX-78, SP-UX-81: the Handout page shows the image under "Map" after a reload', async () => {
      await handoutLinks(page).filter({ hasText: 'Arkham' }).click()
      await page.reload()
      await expect(page.getByRole('heading', { level: 2, name: 'Map' })).toBeVisible()
      const image = page.getByRole('img', { name: 'Arkham' })
      await expect(image).toBeVisible()
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
      await expect(page.getByText('arkham.png, 1 KB')).toBeVisible()
    })
  })

  test('Keeper opens and downloads an Image under its original name', async ({ page }) => {
    const scene = await prepareScene(page, 'Image download')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const id = await addFileHandoutViaApi(page, bearer, scene, planImage())

    await page.goto(`${scene.scenePath}/handouts/${id}`)

    await test.step('SP-UX-81: the page shows the image under "Image" with its name, size, and both actions', async () => {
      await expect(page.getByRole('heading', { level: 2, name: 'Image' })).toBeVisible()
      await expect(page.getByRole('img', { name: 'Corbitt House' })).toBeVisible()
      await expect(page.getByText('corbitt-house.png, 1 KB')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Open Corbitt House full size' })).toHaveAttribute('target', '_blank')
    })

    await test.step('SP-UX-82: Download saves the image under its original name', async () => {
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('link', { name: 'Download corbitt-house.png' }).click()
      expect((await downloadPromise).suggestedFilename()).toBe('corbitt-house.png')
    })
  })

  test('Keeper opens and downloads a Document', async ({ page }) => {
    const scene = await prepareScene(page, 'Document')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const id = await addFileHandoutViaApi(page, bearer, scene, diaryPdf)

    await page.goto(`${scene.scenePath}/handouts/${id}`)

    await test.step('SP-UX-83: the page shows the name, "PDF, 2 KB", Open and Download, and no inline preview', async () => {
      await expect(page.getByRole('heading', { level: 2, name: 'Document' })).toBeVisible()
      await expect(page.getByText('diary-page.pdf', { exact: true })).toBeVisible()
      await expect(page.getByText('PDF, 2 KB')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Open diary-page.pdf' })).toHaveAttribute('target', '_blank')
      await expect(page.locator('iframe, embed, object')).toHaveCount(0)
    })

    await test.step('SP-UX-82: Download saves the PDF under its original name', async () => {
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('link', { name: 'Download diary-page.pdf' }).click()
      expect((await downloadPromise).suggestedFilename()).toBe('diary-page.pdf')
    })
  })

  test('Keeper is told when the chosen image or PDF cannot be used', async ({ page }) => {
    const scene = await prepareScene(page, 'File refusal')
    await openScene(page, scene)
    await openAddHandoutPage(page)
    const submissions: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/handouts')) {
        submissions.push(request.url())
      }
    })
    await handoutTitleField(page).fill('Big picture')
    await visibilityRadio(page, 'Player-facing').click()

    await test.step('SP-UX-79: no image chosen is explained at the field, which is focused', async () => {
      await kindRadio(page, 'Image').click()
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('Choose an image.')).toBeVisible()
      await expect(fileField(page)).toBeFocused()
    })

    await test.step('SP-UX-79: an image over 20 MB is refused with its message and nothing is sent', async () => {
      await chooseHandoutImage(page, { name: 'huge.png', buffer: padded(PNG_BYTES, 21 * 1024 * 1024) })
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText('The image is larger than 20 MB. Choose a smaller one.')).toBeVisible()
      await expect(fileField(page)).toBeFocused()
    })

    await test.step('SP-UX-79: a GIF chosen as a Document is refused as not a PDF and nothing is sent', async () => {
      await kindRadio(page, 'Document').click()
      await chooseHandoutImage(page, { name: 'anim.gif', buffer: Buffer.from('GIF89a'), mimeType: 'image/gif' })
      await handoutSubmitButton(page, 'Add Handout').click()
      await expect(page.getByText("This isn't a PDF. Choose a PDF.")).toBeVisible()
      expect(submissions).toEqual([])
    })

    await test.step('SP-UX-87: switching back to Image restores the image that was chosen', async () => {
      await kindRadio(page, 'Image').click()
      await expect(page.getByText('huge.png, 21.0 MB')).toBeVisible()
    })
  })

  test('Keeper replaces the image of a Handout and the Handout keeps its place', async ({ page }) => {
    const scene = await prepareScene(page, 'Replace')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    await addFileHandoutViaApi(page, bearer, scene, planImage({ title: 'First', name: 'first.png' }))
    const id = await addFileHandoutViaApi(page, bearer, scene, planImage())
    await page.goto(`${scene.scenePath}/handouts/${id}`)
    await page.getByRole('button', { name: 'Edit', exact: true }).click()

    await test.step('SP-UX-84: Edit shows the current image and an optional Replace field', async () => {
      await expect(page.getByText('Current image: corbitt-house.png, 1 KB')).toBeVisible()
      await expect(page.getByLabel('Replace image')).toBeVisible()
      await expect(page.getByText('Leave empty to keep the current image.')).toBeVisible()
    })

    await test.step('SP-UX-85: saving with a new image says "Handout saved." and shows the new size after a reload', async () => {
      await chooseHandoutImage(page, { name: 'second.png', buffer: padded(PNG_BYTES, 3000) })
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Handout saved.' })).toBeVisible()
      await expect(page.getByText('second.png, 3 KB')).toBeVisible()
      await page.reload()
      await expect(page.getByText('second.png, 3 KB')).toBeVisible()
    })

    await test.step('SP-UX-85: the Handout keeps its place in the order', async () => {
      await page.goto(scene.scenePath)
      await expect(handoutLinks(page)).toHaveText(['First', 'Corbitt House'])
    })
  })

  test('Keeper can change an Image to a Map but a Document stays a Document', async ({ page }) => {
    const scene = await prepareScene(page, 'Kind on edit')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const imageId = await addFileHandoutViaApi(page, bearer, scene, planImage())
    const documentId = await addFileHandoutViaApi(page, bearer, scene, diaryPdf)

    await test.step('SP-UX-86: an Image offers only Image and Map, and changing it to a Map is saved', async () => {
      await page.goto(`${scene.scenePath}/handouts/${imageId}`)
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await expect(page.getByRole('radiogroup', { name: 'Kind' }).getByRole('radio')).toHaveCount(2)
      await kindRadio(page, 'Map').click()
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Handout saved.' })).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Map' })).toBeVisible()
    })

    await test.step('SP-UX-86, SP-A11Y-50: a Document shows the sentence inside the Kind group and no radios', async () => {
      await page.goto(`${scene.scenePath}/handouts/${documentId}`)
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await expect(page.getByRole('group', { name: 'Kind' })).toContainText('Document. A Document Handout stays a Document.')
      await expect(page.getByRole('radiogroup', { name: 'Kind' })).toHaveCount(0)
      await expect(page.getByLabel('Replace document')).toBeVisible()
    })
  })

  test('Keeper deletes an Image Handout on a Prepared Scene', async ({ page }) => {
    const scene = await prepareScene(page, 'File delete')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const id = await addFileHandoutViaApi(page, bearer, scene, planImage())
    await page.goto(`${scene.scenePath}/handouts/${id}`)

    await page.getByRole('button', { name: 'Delete Handout' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete Handout' }).click()

    await test.step('SP-UX-89, SP-UX-71: the Scene page says "Corbitt House deleted." and no longer lists it', async () => {
      await expect(page).toHaveURL(new RegExp(`${scene.scenePath}$`))
      await expect(page.getByRole('status').filter({ hasText: 'Corbitt House deleted.' })).toBeVisible()
      await expect(handoutSection(page).getByText('No Handouts yet.')).toBeVisible()
    })
  })

  test('A failed add keeps the form and the chosen image', async ({ page }) => {
    const scene = await prepareScene(page, 'Storage failure')
    await openScene(page, scene)
    await openAddHandoutPage(page)
    await page.route('**/handouts', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ title: "The image or PDF couldn't be stored. Try again." }) })
        return
      }
      await route.continue()
    })
    await handoutTitleField(page).fill('Arkham')
    await kindRadio(page, 'Map').click()
    await visibilityRadio(page, 'Player-facing').click()
    await chooseHandoutImage(page, { name: 'arkham.png', buffer: PNG_BYTES })

    await handoutSubmitButton(page, 'Add Handout').click()

    await test.step("SP-UX-80: the generic failure shows, every input including the image stays, and no Handout is added", async () => {
      await expect(page.getByRole('alert').filter({ hasText: "We couldn't add the Handout. Try again." })).toBeVisible()
      await expect(handoutTitleField(page)).toHaveValue('Arkham')
      await expect(page.getByText('arkham.png, 1 KB')).toBeVisible()
      await page.unroute('**/handouts')
      await openScene(page, scene)
      await expect(handoutSection(page).getByText('No Handouts yet.')).toBeVisible()
    })
  })

  test('Image Handouts are the Keeper alone', async ({ page, browser }) => {
    const scene = await prepareScene(page, 'File boundaries')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const id = await addFileHandoutViaApi(page, bearer, scene, planImage({ title: 'Secret map' }))
    const player = await joinAsNewPlayer(browser, await issueInviteViaUi(page, scene.campaignId))

    try {
      await test.step('SP-UX-74, SP-UX-89: the Player sees "We couldn\'t find that Scene" on the Handout page and no title', async () => {
        await player.page.goto(`${scene.scenePath}/handouts/${id}`)
        await expect(player.page.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeVisible()
        await expect(player.page.getByText('Secret map')).toHaveCount(0)
      })

      await test.step("the Player's bearer gets 404 for the file", async () => {
        const players = await openAndCaptureBearer(player.page, `/campaigns/${scene.campaignId}`)
        const response = await player.page.request.get(handoutsApiUrl(API_ORIGIN, scene.campaignId, scene.scenarioId, scene.sceneId, `/${id}/file`), {
          headers: { Authorization: players },
        })
        expect(response.status()).toBe(404)
      })
    } finally {
      await player.context.close()
    }
  })

  test('Keeper can retry when the image does not load', async ({ page }) => {
    const scene = await prepareScene(page, 'Image load failure')
    const bearer = await openAndCaptureBearer(page, `/campaigns/${scene.campaignId}`)
    const id = await addFileHandoutViaApi(page, bearer, scene, planImage())
    let failing = true
    await page.route('**/handouts/*/file', async (route) => {
      if (failing) {
        await route.fulfill({ status: 503, body: '' })
        return
      }
      await route.continue()
    })

    await page.goto(`${scene.scenePath}/handouts/${id}`)

    await test.step('SP-UX-88: a failed load shows "We couldn\'t load the image." with "Try again" and no actions', async () => {
      // The query retries a failed load with a backoff before it gives up, so the alert comes after about seven seconds.
      await expect(page.getByRole('alert').filter({ hasText: "We couldn't load the image." })).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('link', { name: 'Download corbitt-house.png' })).toHaveCount(0)
    })

    await test.step('SP-UX-88: Try again loads the image', async () => {
      failing = false
      await page.getByRole('button', { name: 'Try again' }).click()
      await expect(page.getByRole('img', { name: 'Corbitt House' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Download corbitt-house.png' })).toBeVisible()
    })
  })
})
