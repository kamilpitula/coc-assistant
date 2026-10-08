import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

import { newAccount, signInNewContext, type MockAccount } from './auth'
import { attentionList, ownRow } from './overview'

/** The API origin the SPA proxies to; used for direct API calls with a captured bearer token. */
export const API_ORIGIN = 'https://localhost:5059'

/** Point Buy values that add up to the section 2.2 budget, matching the shared validation fixtures. */
export const VALID_POINT_BUY: Record<string, string> = {
  STR: '60',
  CON: '60',
  DEX: '60',
  APP: '50',
  POW: '60',
  SIZ: '60',
  INT: '60',
  EDU: '50',
}

export interface PlayerSession {
  account: MockAccount
  context: BrowserContext
  page: Page
}

/** Signs a new Player in, in an isolated context, and joins the Campaign through the Invite token. */
export async function joinAsNewPlayer(browser: Browser, token: string, label = 'Player'): Promise<PlayerSession> {
  const account = newAccount(label)
  const { context, page } = await signInNewContext(browser, account)
  await page.goto(`/campaigns/join/${token}`)
  await page.getByRole('button', { name: /join this campaign/i }).click()
  await expect(page.getByText(/you have joined the campaign as a player/i)).toBeVisible()
  return { account, context, page }
}

/**
 * Opens the page and returns the Authorization header of its first authenticated API request, so a test can call the
 * API directly as that Account.
 */
export async function openAndCaptureBearer(page: Page, path: string): Promise<string> {
  const request = page.waitForRequest(
    (candidate) =>
      new URL(candidate.url()).pathname.startsWith('/api/') &&
      (candidate.headers().authorization ?? '').toLowerCase().startsWith('bearer '),
  )
  await page.goto(path)
  return (await request).headers().authorization as string
}

/** Fills the eight Point Buy inputs on the Characteristics step. */
export async function fillPointBuy(page: Page, values: Record<string, string>): Promise<void> {
  for (const [code, value] of Object.entries(values)) {
    await page.getByLabel(code, { exact: true }).fill(value)
  }
}

/** Picks one option of a labelled Select (shadcn/Radix: a combobox that opens a listbox). */
export async function chooseOption(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

/** Chooses the creation method on the Characteristics step when the Campaign allows several. */
export async function chooseCreationMethod(page: Page, label: 'Standard rolling' | 'Point buy' | 'Quick fire'): Promise<void> {
  await page.getByRole('radio', { name: label }).click()
}

/** Picks the 1920s Antiquarian on the Occupation step and moves on to Occupation skills. */
export async function chooseAntiquarianViaUi(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Occupation' })).toBeVisible()
  await page.getByRole('radio', { name: /^Antiquarian/ }).click()
  await pressWizardAction(page, 'Save and continue')
  await expect(page.getByRole('heading', { level: 1, name: 'Occupation skills' })).toBeVisible()
}

/** Fills the Antiquarian's open slots: Art/Craft (Painting), Language (Other) (Latin), Charm, and Firearms (Handgun). */
export async function pickAntiquarianSkillsViaUi(page: Page): Promise<void> {
  await page.getByRole('combobox', { name: 'Art/Craft specialization', exact: true }).fill('Painting')
  await page.getByRole('combobox', { name: 'Language (Other) specialization', exact: true }).fill('Latin')
  await chooseOption(page, 'Choose 1 interpersonal skill', 'Charm')
  await chooseOption(page, 'Choose 1 skill of your choice', 'Firearms')
  await chooseOption(page, 'Firearms specialization', 'Handgun')
}

/**
 * Spends the 200 occupation points (EDU 50 x 4) with Credit Rating 30 and the 120 personal interest points (INT 60 x 2)
 * of a 25-year-old Antiquarian, leaving the wizard on Sheet and submit.
 */
export async function spendAntiquarianPointsViaUi(page: Page): Promise<void> {
  for (const [skill, points] of [['Credit Rating', '30'], ['Library Use', '50'], ['Appraise', '50'], ['History', '50'], ['Spot Hidden', '20']]) {
    await page.getByLabel(`${skill}, occupation points`).fill(points)
  }
  await expect(page.getByText('Occupation points left: 0 of 200')).toBeVisible()
  await pressWizardAction(page, 'Save and continue')
  await expect(page.getByRole('heading', { level: 1, name: 'Personal interests' })).toBeVisible()
  await page.getByLabel('Drive Auto, personal interest points').fill('60')
  await page.getByLabel('Listen, personal interest points').fill('60')
  await expect(page.getByText('Personal interest points left: 0 of 120')).toBeVisible()
  await pressWizardAction(page, 'Save and continue')
  await expect(page.getByRole('heading', { level: 1, name: 'Sheet and submit' })).toBeVisible()
}

/**
 * Creates and submits a valid Point Buy Investigator for a 25-year-old Antiquarian through the wizard, then returns its
 * id as the API reports it to the Player.
 */
export async function submitValidInvestigatorViaUi(page: Page, campaignId: string, name: string): Promise<string> {
  await saveDraftUpToAgeEffectsViaUi(page, campaignId, name)
  await page.getByRole('group', { name: 'EDU check 1 of 1' }).getByLabel('D100 roll').fill('30')
  await pressWizardAction(page, 'Save and continue')
  await chooseAntiquarianViaUi(page)
  await pickAntiquarianSkillsViaUi(page)
  await spendAntiquarianPointsViaUi(page)
  await page.getByRole('button', { name: 'Submit to Keeper' }).click()
  await expect(ownRow(page)).toContainText('Submitted - waiting for your Keeper')

  const bearer = await openAndCaptureBearer(page, `/campaigns/${campaignId}`)
  const mine = await page.request.get(`${API_ORIGIN}/api/campaigns/${campaignId}/investigators/mine`, {
    headers: { Authorization: bearer },
  })
  expect(mine.status()).toBe(200)
  return ((await mine.json()) as { id: string }).id
}

/**
 * Creates the Player's Draft in a Campaign allowing every creation method, and completes Identity (age 25) and
 * Characteristics with Point buy, leaving the wizard on Age effects, the third step.
 */
export async function saveDraftUpToAgeEffectsViaUi(page: Page, campaignId: string, name: string): Promise<void> {
  await page.goto(`/campaigns/${campaignId}`)
  await attentionList(page).getByRole('button', { name: 'Create Investigator' }).click()
  await page.getByLabel('Investigator name').fill(name)
  await page.getByLabel('Age').fill('25')
  await pressWizardAction(page, 'Save and continue')
  await expect(page.getByRole('heading', { level: 1, name: 'Characteristics' })).toBeVisible()
  // The Campaign allows every creation method by default, so the Player chooses one.
  await chooseCreationMethod(page, 'Point buy')
  await fillPointBuy(page, VALID_POINT_BUY)
  await page.getByLabel('Luck, 3D6 total').fill('11')
  await pressWizardAction(page, 'Save and continue')
  await expect(page.getByRole('heading', { level: 1, name: 'Age effects' })).toBeVisible()
}

/** Presses a wizard action and waits for the save to finish (the pressed button reads "Saving..." meanwhile). */
export async function pressWizardAction(page: Page, name: 'Save and continue' | 'Save and exit' | 'Back'): Promise<void> {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/investigators/mine/character-sheet') && response.request().method() === 'PUT',
  )
  await page.getByRole('button', { name }).click()
  await saved
}

/** Approves the Player's Submitted Investigator from the Keeper's overview, through the review screen. */
export async function approveFromOverview(page: Page, campaignId: string, investigatorName: string): Promise<void> {
  await page.goto(`/campaigns/${campaignId}`)
  await attentionList(page).getByRole('link', { name: `Review ${investigatorName}` }).click()
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText(`${investigatorName} is approved and ready for play.`)).toBeVisible()
}
