import { test, expect, type APIRequestContext } from '@playwright/test'

import { API_ORIGIN, joinAsNewPlayer, openAndCaptureBearer } from '../fixtures/investigators'
import { campaignNav } from '../fixtures/overview'
import { PREPARED } from '../fixtures/prepared-scenario'
import {
  activeScenePath,
  closeTable,
  createApprovedInvestigatorViaApi,
  finishActiveSceneViaApi,
  HARVEY,
  LUCY,
  pageStatus,
  setUpTable,
  startSceneViaApi,
  type Table,
} from '../fixtures/scene-play'
import { openWall, wallPreview } from '../fixtures/wall'
import {
  expectedOutcome,
  requestRollForm,
  requestRollViaUi,
  rollForViaUi,
  rollFromPanel,
  rollRequestCard,
  waitingRolls,
  waitingRollsPanel,
} from '../fixtures/roll-requests'

/**
 * Traces to specs/roll-requests/spec.md Scenarios "Requesting a roll in the Active Scene" and to
 * specs/roll-requests/ux.md: the Keeper's request form (RR-UX-1 to RR-UX-6), "Waiting rolls" (RR-UX-7),
 * the Player's panel (RR-UX-8, RR-UX-9, RR-A11Y-4), the Wall card (RR-UX-10, RR-UX-11), the tab badge (RR-UX-12),
 * the assertive announcement (RR-UX-13), the no-other-Investigator guard (RR-UX-14), the hidden roll form, card,
 * and invisibility (RR-UX-15 to RR-UX-19, RR-A11Y-11 to RR-A11Y-14), and the Wall amendments (WL-UX-7, WL-UX-9).
 * Exceptions, covered by the unit tests: "server rolls 25" (the exact dice mapping of faces to outcome) and the
 * cancel and push scenarios of later PBIs (spec DICE-007, 009).
 */
test.describe('Roll Requests', () => {
  // Each journey signs in a Keeper and joins Players in isolated contexts before it checks anything, which takes longer than the default.
  test.describe.configure({ timeout: 240_000 })

  test('Keeper requests a skill roll from two Investigators and both Players see it live', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Request')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await table.harvey.page.goto(`/campaigns/${campaignId}/active-scene`)
      await expect(table.harvey.page.getByRole('heading', { level: 1, name: PREPARED.firstSceneTitle })).toBeVisible()
      await expect(waitingRollsPanel(table.harvey.page)).toHaveCount(0)
      await table.lucy.page.goto(`/campaigns/${campaignId}/active-scene`)
      await expect(table.lucy.page.getByRole('heading', { level: 1, name: PREPARED.firstSceneTitle })).toBeVisible()
      await expect(waitingRollsPanel(table.lucy.page)).toHaveCount(0)
      await page.goto(activeScenePath(campaignId))

      await test.step('RR-UX-6: requesting shows the status, the Waiting rows, and one card with both Waiting', async () => {
        await requestRollViaUi(page, { target: 'Listen', investigators: [HARVEY, LUCY] })
        await expect(pageStatus(page)).toHaveText('Listen roll requested from Harvey Walters and Lucy Ward.')
        await expect(waitingRolls(page).getByRole('button', { name: 'Roll Listen for Harvey Walters' })).toBeVisible()
        await expect(waitingRolls(page).getByRole('button', { name: 'Roll Listen for Lucy Ward' })).toBeVisible()
        await openWall(page, campaignId)
        const card = rollRequestCard(page, 'Listen')
        await expect(card.getByText('Waiting', { exact: true })).toHaveCount(2)
      })

      await test.step('RR-UX-8, RR-UX-12: both Players see the panel and the badge without reloading', async () => {
        await expect(waitingRollsPanel(table.harvey.page).getByRole('button', { name: 'Roll Listen' })).toBeVisible()
        await expect(waitingRollsPanel(table.lucy.page).getByRole('button', { name: 'Roll Listen' })).toBeVisible()
        await expect(campaignNav(page).getByRole('link', { name: 'Active Scene, live, 2 rolls waiting' })).toBeVisible()
        await expect(campaignNav(table.harvey.page).getByRole('link', { name: 'Active Scene, live, 1 roll waiting' })).toBeVisible()
        await expect(campaignNav(table.lucy.page).getByRole('link', { name: 'Active Scene, live, 1 roll waiting' })).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Player rolls a Requested Roll and every member sees the result', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'PlayerRoll')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await table.harvey.page.goto(`/campaigns/${campaignId}/active-scene`)
      await table.lucy.page.goto(`/campaigns/${campaignId}/wall`)
      await page.goto(activeScenePath(campaignId))
      await requestRollViaUi(page, { target: 'Listen', investigators: [HARVEY, LUCY] })
      await expect(waitingRollsPanel(table.harvey.page).getByRole('button', { name: 'Roll Listen' })).toBeVisible()

      await test.step('RR-UX-9: the panel shows the result and drops the row', async () => {
        await rollFromPanel(table.harvey.page, 'Roll Listen')
        const result = waitingRollsPanel(table.harvey.page).getByRole('status')
        await expect(result).toContainText(/^You rolled \d+: .+\./)
        await expect(waitingRollsPanel(table.harvey.page).getByRole('button', { name: 'Roll Listen' })).toHaveCount(0)
      })

      await test.step('RR-UX-10: the card shows the faces, targets, and outcome with the Player as the roller', async () => {
        const rolled = await keeperRequestedRoll(request, table, campaignId, table.harveyId)
        const card = rollRequestCard(table.lucy.page, 'Listen')
        await expect(card).toContainText(`target ${targetsLine(rolled.targetValue)}`)
        await expect(card).toContainText(expectedOutcome(rolled.result, rolled.targetValue, 'Regular'))
        await expect(card).toContainText(`Rolled by ${rolled.rolledBy}`)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A hidden roll is rolled at once and stays Keeper-only', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'Hidden')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await table.harvey.page.goto(`/campaigns/${campaignId}/active-scene`)
      await expect(waitingRollsPanel(table.harvey.page)).toHaveCount(0)
      await page.goto(activeScenePath(campaignId))

      await test.step('RR-UX-18: Keeper only rolls now and the status names the inline result', async () => {
        await requestRollViaUi(page, { target: 'Psychology', investigators: [HARVEY], visibility: 'KeeperOnly' })
        await expect(pageStatus(page)).toHaveText(/^Psychology hidden roll: Harvey Walters rolled \d+: .+\.$/)
      })

      await test.step('RR-UX-17: the choice stays Keeper only after the request', async () => {
        await expect(requestRollForm(page).getByRole('radio', { name: 'Keeper only (hidden roll)' })).toBeChecked()
      })

      await test.step('RR-UX-18: the card is marked Keeper only with a hidden-roller suffix', async () => {
        await openWall(page, campaignId)
        const card = rollRequestCard(page, 'Psychology')
        await expect(card.getByText('Keeper only', { exact: true })).toBeVisible()
        await expect(card.getByText(/Rolled by .+ \(hidden roll\)/)).toBeVisible()
        await expect(card.getByText('Waiting', { exact: true })).toHaveCount(0)
      })

      await test.step('RR-UX-18, RR-UX-12: nothing waits and the tab badge shows no count', async () => {
        await page.goto(activeScenePath(campaignId))
        await expect(waitingRolls(page).getByText('No rolls waiting.')).toBeVisible()
        await expect(campaignNav(page).getByRole('link', { name: 'Active Scene, live', exact: true })).toBeVisible()
      })

      await test.step('RR-UX-17: the choice is Public after leaving Run and coming back', async () => {
        await openWall(page, campaignId)
        await page.goto(activeScenePath(campaignId))
        await expect(requestRollForm(page).getByRole('radio', { name: 'Public' })).toBeChecked()
      })

      await test.step('RR-UX-19, RR-UX-12, RR-UX-13: the Player receives no panel, badge, card, or announcement', async () => {
        await expect(waitingRollsPanel(table.harvey.page)).toHaveCount(0)
        await expect(campaignNav(table.harvey.page).getByRole('link', { name: 'Active Scene, live', exact: true })).toBeVisible()
        await expect(table.harvey.page.locator('div[aria-live="assertive"]')).toHaveText('')
        await openWall(table.harvey.page, campaignId)
        await expect(rollRequestCard(table.harvey.page, 'Psychology')).toHaveCount(0)
        await table.harvey.page.goto(`/campaigns/${campaignId}`)
        await expect(wallPreview(table.harvey.page)).not.toContainText('Psychology')
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Player cannot read a hidden Roll Request', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'HiddenUnreadable')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${campaignId}/active-scene`)
      const created = await createRollRequest(request, table.keeperBearer, campaignId, {
        target: { kind: 'Skill', skill: 'Psychology', specialization: null, characteristic: null },
        visibility: 'KeeperOnly',
        investigators: [{ investigatorId: table.harveyId }],
      })
      expect(created.status()).toBe(201)
      const requestId = ((await created.json()) as { id: string }).id

      await test.step('Reading the request by id answers 404', async () => {
        const response = await request.get(`${API_ORIGIN}/api/campaigns/${campaignId}/roll-requests/${requestId}`, {
          headers: { Authorization: harveyBearer },
        })
        expect(response.status()).toBe(404)
      })

      await test.step('Rolling the request answers 404', async () => {
        const response = await request.post(rollUrl(campaignId, requestId, table.harveyId), {
          headers: { Authorization: harveyBearer },
        })
        expect(response.status()).toBe(404)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('The Keeper rolls for an absent Player and the card names the Keeper', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'KeeperRoll')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await table.lucy.context.close()
      await page.goto(activeScenePath(campaignId))
      await requestRollViaUi(page, { target: 'Listen', investigators: [HARVEY, LUCY] })

      await test.step('RR-UX-7: "Roll for Lucy Ward" rolls the row with "Rolled by {Keeper}"', async () => {
        await rollForViaUi(page, LUCY, 'Listen')
        await expect(waitingRolls(page).getByRole('status')).toContainText(new RegExp(`^${LUCY} rolled \\d+ for Listen: `))
        const rolled = await keeperRequestedRoll(request, table, campaignId, table.lucyId)
        await openWall(page, campaignId)
        const card = rollRequestCard(page, 'Listen')
        await expect(card).toContainText(expectedOutcome(rolled.result, rolled.targetValue, 'Regular'))
        await expect(card).toContainText(`Rolled by ${rolled.rolledBy}`)
      })
    } finally {
      await table.harvey.context.close()
    }
  })

  test('Per-Investigator Difficulty and dice show on each card row', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'PerRow')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await page.goto(activeScenePath(campaignId))

      await test.step('RR-UX-4: Lucy rolls with a Penalty Die while Harvey uses the defaults', async () => {
        await requestRollViaUi(page, {
          target: 'Spot Hidden',
          investigators: [HARVEY, { name: LUCY, penaltyDice: 1 }],
        })
        await openWall(page, campaignId)
        const card = rollRequestCard(page, 'Spot Hidden')
        await expect(card.getByText('Regular . no Bonus or Penalty Dice')).toBeVisible()
        await expect(card.getByText('Regular . 1 Penalty Die')).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A skill the Investigator lacks shows its catalog base value', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'BaseValue')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await page.goto(activeScenePath(campaignId))

      await test.step('The card row names the base value with the catalog number', async () => {
        await requestRollViaUi(page, { target: 'Charm', investigators: [HARVEY] })
        const created = await keeperRollRequests(request, table, campaignId)
        const value = created[0].requestedRolls[0].targetValue
        await openWall(page, campaignId)
        const card = rollRequestCard(page, 'Charm')
        await expect(card).toContainText(`target ${targetsLine(value)} (base value)`)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Player cannot roll for another Investigator', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'NotYours')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${campaignId}`)
      await createRollRequest(request, table.keeperBearer, campaignId, {
        target: { kind: 'Skill', skill: 'Listen', specialization: null, characteristic: null },
        investigators: [{ investigatorId: table.harveyId }, { investigatorId: table.lucyId }],
      })
      await table.harvey.page.goto(`/campaigns/${campaignId}/active-scene`)

      await test.step('RR-UX-14: the roll as Harvey for Lucy gives 404 and Lucy stays Waiting', async () => {
        const created = await keeperRollRequests(request, table, campaignId)
        const response = await request.post(rollUrl(campaignId, created[0].id, table.lucyId), { headers: { Authorization: harveyBearer } })
        expect(response.status()).toBe(404)
        const rows = await keeperRollRequests(request, table, campaignId)
        expect(rows[0].requestedRolls.find((row) => row.investigatorId === table.lucyId)?.status).toBe('Waiting')
        await expect(table.harvey.page.getByRole('button', { name: /Roll for/ })).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Requested Roll is rolled only once', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'Once')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${campaignId}/active-scene`)
      await page.goto(activeScenePath(campaignId))
      await requestRollViaUi(page, { target: 'Listen', investigators: [HARVEY] })
      await rollFromPanel(table.harvey.page, 'Roll Listen')
      await expect(waitingRollsPanel(table.harvey.page).getByRole('status')).toContainText(/^You rolled \d+/)

      await test.step('A second roll gives 409 and the card shows one result', async () => {
        const created = await keeperRollRequests(request, table, campaignId)
        const response = await request.post(rollUrl(campaignId, created[0].id, table.harveyId), { headers: { Authorization: harveyBearer } })
        expect(response.status()).toBe(409)
        await openWall(page, campaignId)
        await expect(rollRequestCard(page, 'Listen').getByText(/Rolled by/)).toHaveCount(1)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A successful skill roll earns an experience check without changing the sheet', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'CheckEarned')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${campaignId}/active-scene`)
      await page.goto(activeScenePath(campaignId))
      const before = await characterSheet(request, harveyBearer, campaignId)

      await test.step('RR-UX-11: the bounded loop reaches a success and the row earns the check', async () => {
        // Listen is at least 60, so ten failures in a row are below 0.4^10.
        let earned = false
        for (let attempt = 0; attempt < 10 && !earned; attempt += 1) {
          await requestRollViaUi(page, { target: 'Listen', investigators: [HARVEY] })
          await rollFromPanel(table.harvey.page, 'Roll Listen')
          const status = waitingRollsPanel(table.harvey.page).getByRole('status')
          await expect(status).toContainText(/^You rolled \d+/)
          earned = (await status.textContent())?.includes('Experience check earned') ?? false
        }
        expect(earned).toBe(true)
        await openWall(page, campaignId)
        await expect(rollRequestCard(page, 'Listen').getByText('Experience check earned').first()).toBeVisible()
      })

      await test.step('The Player sheet is unchanged', async () => {
        expect(await characterSheet(request, harveyBearer, campaignId)).toEqual(before)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A success with a Bonus Die earns no experience check', async ({ page, browser }) => {
    const table = await setUpTable(page, browser, 'BonusDie')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await table.harvey.page.goto(`/campaigns/${campaignId}/active-scene`)
      await page.goto(activeScenePath(campaignId))
      await requestRollViaUi(page, { target: 'Listen', investigators: [HARVEY], bonusDice: 1 })

      await test.step('The rolled row never earns the check, whatever the result', async () => {
        await rollFromPanel(table.harvey.page, 'Roll Listen')
        await expect(waitingRollsPanel(table.harvey.page).getByRole('status')).toContainText(/^You rolled \d+/)
        await openWall(page, campaignId)
        await expect(rollRequestCard(page, 'Listen')).toBeVisible()
        await expect(rollRequestCard(page, 'Listen').getByText('Experience check earned')).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('A Roll Request needs an Active Scene', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'NoScene')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await finishActiveSceneViaApi(page.request, table.keeperBearer, campaignId)

      await test.step('Creating gives 409 and no card appears', async () => {
        const response = await createRollRequest(request, table.keeperBearer, campaignId, {
          target: { kind: 'Skill', skill: 'Listen', specialization: null, characteristic: null },
          investigators: [{ investigatorId: table.harveyId }],
        })
        expect(response.status()).toBe(409)
        await openWall(page, campaignId)
        await expect(rollRequestCard(page, 'Listen')).toHaveCount(0)
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Only Investigators present can be targeted', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'NotPresent')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      const max = await joinAsNewPlayer(browser, table.inviteToken, 'Max')
      try {
        const maxBearer = await openAndCaptureBearer(max.page, `/campaigns/${campaignId}`)
        const maxId = await createApprovedInvestigatorViaApi(request, table.keeperBearer, maxBearer, campaignId, 'Max Carr')

        await test.step('Targeting the absent Investigator gives 400 and no card appears', async () => {
          const response = await createRollRequest(request, table.keeperBearer, campaignId, {
            target: { kind: 'Skill', skill: 'Listen', specialization: null, characteristic: null },
            investigators: [{ investigatorId: maxId }],
          })
          expect(response.status()).toBe(400)
          await openWall(page, campaignId)
          await expect(rollRequestCard(page, 'Listen')).toHaveCount(0)
        })
      } finally {
        await max.context.close()
      }
    } finally {
      await closeTable(table)
    }
  })

  test('A Roll Request card cannot be removed', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'NoRemove')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      await page.goto(activeScenePath(campaignId))
      await requestRollViaUi(page, { target: 'Listen', investigators: [HARVEY] })
      await openWall(page, campaignId)

      await test.step('WL-UX-7: the card has no Remove and deleting its entry gives 409', async () => {
        const card = rollRequestCard(page, 'Listen')
        await expect(card).toBeVisible()
        await expect(card.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
        const entries = await wallEntries(request, table.keeperBearer, campaignId)
        const entryId = entries.find((entry) => entry.rollRequestId !== null)?.id
        expect(entryId).toBeDefined()
        const response = await request.delete(`${API_ORIGIN}/api/campaigns/${campaignId}/wall-entries/${entryId}`, {
          headers: { Authorization: table.keeperBearer },
        })
        expect(response.status()).toBe(409)
        await expect(rollRequestCard(page, 'Listen')).toBeVisible()
      })
    } finally {
      await closeTable(table)
    }
  })

  test('Players cannot create Roll Requests', async ({ page, browser, request }) => {
    const table = await setUpTable(page, browser, 'PlayerCreate')
    try {
      const campaignId = table.prepared.campaignId
      await startSceneViaApi(page.request, table.keeperBearer, campaignId, table.prepared.sceneId, [table.harveyId, table.lucyId])
      const harveyBearer = await openAndCaptureBearer(table.harvey.page, `/campaigns/${campaignId}/active-scene`)

      await test.step('RR-UX-14: the Player sees no form and creating gives 404', async () => {
        await expect(table.harvey.page.getByRole('form', { name: 'Request a roll' })).toHaveCount(0)
        const response = await createRollRequest(request, harveyBearer, campaignId, {
          target: { kind: 'Skill', skill: 'Listen', specialization: null, characteristic: null },
          investigators: [{ investigatorId: table.harveyId }],
        })
        expect(response.status()).toBe(404)
      })
    } finally {
      await closeTable(table)
    }
  })
})

/** The Keeper's Active Scene Roll Requests: the row ids, snapshot targets, and results the card asserts on. */
interface KeeperRow {
  investigatorId: string
  targetValue: number
  status: string
  rolls: Array<{ result: number; rolledBy: string | null }>
}

interface KeeperRequest {
  id: string
  requestedRolls: KeeperRow[]
}

interface WallEntry {
  id: string
  rollRequestId: string | null
}

function createUrl(campaignId: string): string {
  return `${API_ORIGIN}/api/campaigns/${campaignId}/active-scene/roll-requests`
}

function rollUrl(campaignId: string, rollRequestId: string, investigatorId: string): string {
  return `${API_ORIGIN}/api/campaigns/${campaignId}/roll-requests/${rollRequestId}/requested-rolls/${investigatorId}/roll`
}

/** Creates a Public Regular roll request through the API. */
async function createRollRequest(request: APIRequestContext, bearer: string, campaignId: string, body: unknown) {
  return request.post(createUrl(campaignId), {
    headers: { Authorization: bearer },
    data: { message: null, visibility: 'Public', difficulty: 'Regular', bonusDice: 0, penaltyDice: 0, ...(body as Record<string, unknown>) },
  })
}

/** The Keeper's Active Scene Roll Requests, oldest first. */
async function keeperRollRequests(request: APIRequestContext, table: Table, campaignId: string): Promise<KeeperRequest[]> {
  const response = await request.get(createUrl(campaignId), { headers: { Authorization: table.keeperBearer } })
  expect(response.status()).toBe(200)
  return (await response.json()) as KeeperRequest[]
}

/** The requested roll of this Investigator once it has a result. */
async function keeperRequestedRoll(
  request: APIRequestContext,
  table: Table,
  campaignId: string,
  investigatorId: string,
): Promise<{ targetValue: number; result: number; rolledBy: string }> {
  const requests = await keeperRollRequests(request, table, campaignId)
  const row = requests.flatMap((created) => created.requestedRolls).find((candidate) => candidate.investigatorId === investigatorId)
  expect(row?.rolls).toHaveLength(1)
  return { targetValue: row?.targetValue ?? 0, result: row?.rolls[0].result ?? 0, rolledBy: row?.rolls[0].rolledBy ?? '' }
}

/** The three target values the card prints from the snapshot Regular value (game-rules skill rolls section 2). */
function targetsLine(value: number): string {
  return `${value} / ${Math.floor(value / 2)} / ${Math.floor(value / 5)}`
}

/** The Player's Character Sheet through the API, compared before and after the roll. */
async function characterSheet(request: APIRequestContext, bearer: string, campaignId: string): Promise<unknown> {
  const response = await request.get(`${API_ORIGIN}/api/campaigns/${campaignId}/investigators/mine/character-sheet`, {
    headers: { Authorization: bearer },
  })
  expect(response.status()).toBe(200)
  return (await response.json()) as unknown
}

/** The Wall entries the Keeper may read, newest first. */
async function wallEntries(request: APIRequestContext, bearer: string, campaignId: string): Promise<WallEntry[]> {
  const response = await request.get(`${API_ORIGIN}/api/campaigns/${campaignId}/wall-entries`, { headers: { Authorization: bearer } })
  expect(response.status()).toBe(200)
  return ((await response.json()) as { entries: WallEntry[] }).entries
}
