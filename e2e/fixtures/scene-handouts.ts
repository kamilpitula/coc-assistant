import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Locators and actions for Scene Handouts (specs/scenario-preparation/ux.md sections 40 to 49): the "Handouts" section of the
 * Scene page, the Add Handout page and form, and the Handout page.
 */
export function handoutSection(page: Page): Locator {
  return page.getByRole('region', { name: 'Handouts', exact: true })
}

/** The titles linked from the Handouts section, in stored order. */
export function handoutLinks(page: Page): Locator {
  return handoutSection(page).getByRole('listitem').getByRole('link')
}

/** The API URL of a Scene's Handouts (or of one Handout, or of the order resource). */
export function handoutsApiUrl(apiOrigin: string, campaignId: string, scenarioId: string, sceneId: string, suffix = ''): string {
  return `${apiOrigin}/api/campaigns/${campaignId}/scenarios/${scenarioId}/scenes/${sceneId}/handouts${suffix}`
}

/** The Handout form's Title field. */
export function handoutTitleField(page: Page): Locator {
  return page.getByLabel('Title', { exact: true })
}

/** The Kind radio of the given name. */
export function kindRadio(page: Page, name: 'Read-aloud' | 'Text' | 'Image' | 'Document' | 'Map'): Locator {
  return page.getByRole('radiogroup', { name: 'Kind' }).getByRole('radio', { name, exact: true })
}

/** The "Who can see it" radio of the given name ("Player-facing" or "Keeper-facing"). */
export function visibilityRadio(page: Page, name: 'Player-facing' | 'Keeper-facing'): Locator {
  return page.getByRole('radiogroup', { name: 'Who can see it' }).getByRole('radio', { name, exact: true })
}

/** The rich-text editor's editable area for the Handout text. */
export function handoutTextEditor(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Text', exact: true })
}

/**
 * The form's submit button. The rich-text toolbar has buttons of its own, so the submit button is picked by its type
 * rather than by position.
 */
export function handoutSubmitButton(page: Page, name: string): Locator {
  return page.locator('button[type="submit"]').filter({ hasText: name })
}

/** A minimal Lexical document with one paragraph, for creating a Handout through the API. */
export function textDocument(text: string): unknown {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          children: [{ type: 'text', version: 1, text, format: 0, style: '', detail: 0, mode: 'normal' }],
        },
      ],
    },
  }
}

/** Opens the Add Handout page from the Scene page that is already open and waits for it. */
export async function openAddHandoutPage(page: Page): Promise<void> {
  await handoutSection(page).getByRole('link', { name: 'Add Handout' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Add Handout' })).toBeVisible()
}

/** Fills the Add Handout form that is already open: the title, the kind, the visibility, and plain text. */
export async function fillHandoutForm(
  page: Page,
  handout: { title: string; kind: 'Read-aloud' | 'Text'; visibility: 'Player-facing' | 'Keeper-facing'; text: string },
): Promise<void> {
  await handoutTitleField(page).fill(handout.title)
  await kindRadio(page, handout.kind).click()
  await visibilityRadio(page, handout.visibility).click()
  await handoutTextEditor(page).click()
  await page.keyboard.type(handout.text)
}

/** Adds a Handout through the Add Handout page that is already open, then waits for the Scene page to confirm it. */
export async function addHandoutViaUi(
  page: Page,
  handout: { title: string; kind: 'Read-aloud' | 'Text'; visibility: 'Player-facing' | 'Keeper-facing'; text: string },
): Promise<void> {
  await fillHandoutForm(page, handout)
  await handoutSubmitButton(page, 'Add Handout').click()
  await expect(page.getByRole('status').filter({ hasText: `${handout.title} added.` })).toBeVisible()
}

/** A valid 1x1 PNG, so no binary fixture is committed. */
export const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** A minimal PDF header, enough for the server to detect a PDF. */
export const PDF_BYTES = Buffer.from(['%PDF-1.4', '1 0 obj', '<< >>', 'endobj', '%%EOF', ''].join(String.fromCharCode(10)))

/** The bytes padded with zeros to the given length, so a file has a chosen size and keeps its signature. */
export function padded(bytes: Buffer, length: number): Buffer {
  return Buffer.concat([bytes, Buffer.alloc(Math.max(0, length - bytes.length))])
}

/** The native image or PDF input of the Handout form (there is only one on the page at a time). */
export function fileField(page: Page): Locator {
  return page.locator('input[type="file"]')
}

/** Chooses an image in the Handout form, as the browser would report it. */
export async function chooseHandoutImage(page: Page, file: { name: string; buffer: Buffer; mimeType?: string }): Promise<void> {
  await fileField(page).setInputFiles({ name: file.name, mimeType: file.mimeType ?? 'image/png', buffer: file.buffer })
}

/** Chooses a PDF in the Handout form, as the browser would report it. */
export async function chooseHandoutPdf(page: Page, file: { name: string; buffer: Buffer; mimeType?: string }): Promise<void> {
  await fileField(page).setInputFiles({ name: file.name, mimeType: file.mimeType ?? 'application/pdf', buffer: file.buffer })
}
