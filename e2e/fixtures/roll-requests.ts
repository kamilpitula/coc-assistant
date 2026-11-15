import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test'

import { API_ORIGIN } from './investigators'
import { pageStatus } from './scene-play'

/**
 * Locators and actions for Roll Requests (specs/roll-requests/ux.md): the Keeper's request form on Run,
 * the Keeper's Waiting list, the Player's panel, and the Wall card.
 */

export type RollDifficulty = 'Regular' | 'Hard' | 'Extreme'

export interface InvestigatorRollChoice {
  name: string
  difficulty?: RollDifficulty
  bonusDice?: number
  penaltyDice?: number
}

export interface RequestRollOptions {
  target: string
  investigators: Array<string | InvestigatorRollChoice>
  message?: string
  visibility?: 'Public' | 'KeeperOnly'
  difficulty?: RollDifficulty
  bonusDice?: number
  penaltyDice?: number
}

/** The Keeper's "Request a roll" form on the Run tab. */
export function requestRollForm(page: Page): Locator {
  return page.getByRole('form', { name: 'Request a roll' })
}

/** The Keeper's "Waiting rolls" list on the Run tab. */
export function waitingRolls(page: Page): Locator {
  return page.getByRole('region', { name: /Waiting rolls/ })
}

/** The Player's "Rolls waiting for you" panel on the Active Scene. */
export function waitingRollsPanel(page: Page): Locator {
  return page.getByRole('region', { name: 'Rolls waiting for you' })
}

/** The Wall card of a Roll Request for this target. */
export function rollRequestCard(page: Page, target: string): Locator {
  return page.getByRole('article', { name: `${target} roll` })
}

/**
 * Picks the "What to roll" target through the combobox's keyboard typeahead without ever relying on the open
 * dropdown: waits for it to be enabled (the catalog has loaded), focuses it, types the full option name, presses
 * Escape, and asserts the combobox shows the chosen value. Every step is valid whether the dropdown stays closed or
 * opens mid-typing, which is what makes this deterministic. Radix hides everything outside an open listbox from
 * assistive tech (`hideOthers`) and blocks pointer events there, so the combobox can only be queried while closed.
 * Typing on the closed trigger commits every keystroke through its own typeahead, so each longer prefix only narrows
 * the match and the full name, spaces included, always selects itself (a space opens the dropdown only when no search
 * is active, and the search here is never empty mid-name). If the popper positions and steals focus mid-typing, later
 * keys only highlight through the listbox typeahead, which never commits without Enter and cannot move the value away
 * from what the earlier keystrokes already selected. Escape closes an open dropdown without changing the value and is
 * a no-op on a closed one, so the final assertion always sees the settled, queryable combobox. This is also how real
 * keyboard users pick a value (focus and type), so it exercises the ux.md RR-UX-2 promise. Clicking the option
 * directly is not stable here: the list is long and grouped, and Playwright's scroll-into-view cannot reach options
 * outside the Radix popper viewport ("element is outside of the viewport"). Real users scroll the inner viewport
 * instead.
 */
async function chooseTarget(page: Page, target: string): Promise<void> {
  const combobox = page.getByRole('combobox', { name: 'What to roll', exact: true })
  await expect(combobox).toBeEnabled()
  await combobox.focus()
  await page.keyboard.type(target, { delay: 25 })
  await page.keyboard.press('Escape')
  await expect(combobox).toContainText(target)
}

async function chooseDice(scope: Locator, page: Page, label: string, count: number): Promise<void> {
  await scope.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: String(count), exact: true }).click()
}

/**
 * Requests a roll through the Keeper's form: picks the target, checks who rolls (with per-Investigator Difficulty
 * and dice changes where given), submits, and waits for the request status (ux.md RR-UX-6). The status wait matters:
 * the form reports 400/409 inline without throwing, so returning right after the click would let a caller read the
 * Keeper list before the request exists.
 */
export async function requestRollViaUi(page: Page, options: RequestRollOptions): Promise<void> {
  const form = requestRollForm(page)
  await expect(form).toBeVisible()
  await chooseTarget(page, options.target)
  if (options.message !== undefined) {
    await form.getByRole('textbox', { name: 'Message (optional)' }).fill(options.message)
  }
  const defaults = form.getByRole('group', { name: 'For everyone' })
  if (options.difficulty !== undefined && options.difficulty !== 'Regular') {
    await defaults.getByRole('radio', { name: options.difficulty, exact: true }).check()
  }
  if (options.bonusDice !== undefined && options.bonusDice > 0) {
    await chooseDice(defaults, page, 'Bonus Dice', options.bonusDice)
  }
  if (options.penaltyDice !== undefined && options.penaltyDice > 0) {
    await chooseDice(defaults, page, 'Penalty Dice', options.penaltyDice)
  }
  for (const investigator of options.investigators) {
    const name = typeof investigator === 'string' ? investigator : investigator.name
    await form.getByRole('checkbox', { name }).check()
    if (typeof investigator !== 'string') {
      await form.getByRole('button', { name: `Change Difficulty and dice for ${name}` }).click()
      const changes = form.getByRole('group', { name: `Changes for ${name}` })
      if (investigator.difficulty !== undefined) {
        await changes.getByRole('radio', { name: investigator.difficulty, exact: true }).check()
      }
      if (investigator.bonusDice !== undefined && investigator.bonusDice > 0) {
        await chooseDice(changes, page, 'Bonus Dice', investigator.bonusDice)
      }
      if (investigator.penaltyDice !== undefined && investigator.penaltyDice > 0) {
        await chooseDice(changes, page, 'Penalty Dice', investigator.penaltyDice)
      }
      await form.getByRole('button', { name: `Done changing Difficulty and dice for ${name}` }).click()
    }
  }
  const hidden = options.visibility === 'KeeperOnly'
  if (hidden) {
    await form.getByRole('radio', { name: 'Keeper only (hidden roll)' }).check()
  }
  await form.getByRole('button', { name: hidden ? /^Roll now/ : /^Request roll/ }).click()
  const names = options.investigators.map((investigator) => (typeof investigator === 'string' ? investigator : investigator.name))
  // Local 15s budget, not the 5s default: the first create after a fresh server start can stall on LocalDB first
  // writes while the button already reads "Requesting...". A refusal still fails loudly: the form keeps the choices
  // and shows an inline Alert instead of the status line.
  if (hidden) {
    await expect(pageStatus(page)).toContainText(`${options.target} hidden roll: `, { timeout: 15_000 })
  } else {
    await expect(pageStatus(page)).toContainText(`${options.target} roll requested from ${joinNames(names)}.`, {
      timeout: 15_000,
    })
  }
}

export interface RequestRollViaApiOptions {
  /** "Luck" or a skill name; the request is Regular with no dice. */
  target: string
  investigatorIds: string[]
  message?: string
  visibility?: 'Public' | 'KeeperOnly'
}

/**
 * Requests a roll through the API as the Keeper (specs/roll-requests/spec.md, API Contracts) and returns the Roll
 * Request id.
 */
export async function requestRollViaApi(
  request: APIRequestContext,
  keeperBearer: string,
  campaignId: string,
  options: RequestRollViaApiOptions,
): Promise<string> {
  const response = await request.post(`${API_ORIGIN}/api/campaigns/${campaignId}/active-scene/roll-requests`, {
    headers: { Authorization: keeperBearer },
    data: {
      target: options.target === 'Luck' ? { kind: 'Luck' } : { kind: 'Skill', skill: options.target },
      message: options.message ?? null,
      visibility: options.visibility ?? 'Public',
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      investigators: options.investigatorIds.map((investigatorId) => ({ investigatorId })),
    },
  })
  expect(response.status(), 'request the roll through the API').toBe(201)
  return ((await response.json()) as { id: string }).id
}

/** "Harvey Walters", "Harvey Walters and Lucy Ward", "Harvey Walters, Lucy Ward and Cy Holloway" (ux.md section 11). */
function joinNames(names: string[]): string {
  if (names.length <= 2) {
    return names.join(' and ')
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Rolls the Player's Waiting roll for this target from "Rolls waiting for you". */
export async function rollFromPanel(page: Page, name: string | RegExp): Promise<void> {
  await waitingRollsPanel(page).getByRole('button', { name }).click()
}

/** Asks to push the Player's failed roll from "Rolls you can push" and waits for the Push asked row (ux.md RR-UX-26). */
export async function askToPushViaUi(page: Page, target: string, justification: string): Promise<void> {
  const panel = waitingRollsPanel(page)
  await panel.getByRole('button', { name: new RegExp(`^Push ${target} roll`) }).click()
  await panel.getByRole('textbox', { name: /Tell the Keeper how/ }).fill(justification)
  await panel.getByRole('button', { name: 'Ask the Keeper' }).click()
  await expect(panel.getByText('Push asked - waiting for the Keeper')).toBeVisible()
}

/** Approves the push from the Keeper's "Waiting rolls" with the dice and waits for the Pushed row (ux.md RR-UX-27). Both dice are set explicitly: the selects preset to the Requested Roll's original dice, so leaving one untouched would approve the original dice, not 0. */
export async function approvePushViaUi(page: Page, investigatorName: string, target: string, bonusDice: number, penaltyDice: number): Promise<void> {
  const list = waitingRolls(page)
  await list.getByRole('button', { name: `Approve push of ${target} for ${investigatorName}` }).click()
  const group = list.getByRole('group', { name: `Dice for ${investigatorName}'s pushed roll` })
  await group.getByRole('combobox', { name: 'Bonus Dice' }).click()
  await page.getByRole('option', { name: String(bonusDice), exact: true }).click()
  await group.getByRole('combobox', { name: 'Penalty Dice' }).click()
  await page.getByRole('option', { name: String(penaltyDice), exact: true }).click()
  await group.getByRole('button', { name: `Confirm approval of ${target} push for ${investigatorName}` }).click()
  await expect(list.getByRole('button', { name: `Roll pushed ${target} for ${investigatorName}` })).toBeVisible()
}

/** Declines the push from the Keeper's "Waiting rolls" and waits for the declined status (ux.md RR-UX-28). */
export async function declinePushViaUi(page: Page, investigatorName: string, target: string): Promise<void> {
  const list = waitingRolls(page)
  await list.getByRole('button', { name: `Decline push of ${target} for ${investigatorName}` }).click()
  await expect(list.getByRole('status')).toHaveText(`${investigatorName}'s push was declined.`)
}

/** Rolls a Waiting row for this Investigator from the Keeper's "Waiting rolls" (accessible name "Roll {target} for {name}"). */
export async function rollForViaUi(page: Page, investigatorName: string, target: string): Promise<void> {
  await waitingRolls(page).getByRole('button', { name: `Roll ${target} for ${investigatorName}` }).click()
}

/** Cancels a Waiting row for this Investigator from the Keeper's "Waiting rolls" (ux.md RR-UX-20). */
export async function cancelRollViaUi(page: Page, investigatorName: string, target: string): Promise<void> {
  await waitingRolls(page).getByRole('button', { name: `Cancel ${target} roll for ${investigatorName}` }).click()
}

/**
 * The expected outcome copy for a displayed result against the row's snapshot target value and Difficulty.
 * Follows docs/game-rules/coc7_skill_rolls_rules.md sections 4.2 (Critical and Fumble) and 4.3 (resolving a roll):
 * the Fumble range depends on the target the Difficulty asks for, and a level below the Difficulty still names
 * the level reached.
 */
export function expectedOutcome(result: number, value: number, difficulty: RollDifficulty): string {
  const requiredTarget = difficulty === 'Regular' ? value : difficulty === 'Hard' ? Math.floor(value / 2) : Math.floor(value / 5)
  if (result === 1) {
    return 'Critical success'
  }
  if (requiredTarget < 50 ? result >= 96 : result === 100) {
    return 'Fumble'
  }
  let level: 'Regular' | 'Hard' | 'Extreme' | 'Failure' = 'Failure'
  if (result <= Math.floor(value / 5)) {
    level = 'Extreme'
  } else if (result <= Math.floor(value / 2)) {
    level = 'Hard'
  } else if (result <= value) {
    level = 'Regular'
  }
  if (level === 'Failure') {
    return 'Failure'
  }
  const rank = { Regular: 0, Hard: 1, Extreme: 2 } as const
  if (rank[level] < rank[difficulty]) {
    return `${level} - not enough for ${difficulty}`
  }
  return `${level} success`
}
