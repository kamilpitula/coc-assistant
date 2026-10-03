import { test, expect, type Request } from '@playwright/test'

import { newAccount, signIn, signInNewContext } from '../fixtures/auth'
import { createCampaignViaUi, issueInviteViaUi } from '../fixtures/campaigns'

/**
 * Traces to specs/campaign-play/spec.md Regression Guardrail "A Player cannot perform Keeper
 * actions through a Player-authorized operation", mapped to the 404 response the invite
 * management endpoints return to non-Keepers; the Player's Campaign page is the overview of
 * specs/campaign-overview/ux.md, where Invite management is never shown (CO-UX-3).
 */
test.describe('Player cannot manage the Keeper\'s Invite', () => {
  test('Scenario 7: UI hides Keeper controls and the API refuses the Player\'s token', async ({
    page,
    browser,
  }) => {
    const keeper = newAccount('Keeper')
    await signIn(page, keeper)

    const campaignId = await createCampaignViaUi(page, `Guard ${keeper.oid.slice(0, 6)}`)
    const token = await issueInviteViaUi(page, campaignId)

    const player = newAccount('Player')
    const session = await signInNewContext(browser, player)
    try {
      await test.step('Player joins the Campaign through the Invite', async () => {
        await session.page.goto(`/campaigns/join/${token}`)
        await session.page.getByRole('button', { name: /join this campaign/i }).click()
        await expect(
          session.page.getByText(/you have joined the campaign as a player/i),
        ).toBeVisible()
      })

      let capturedAuth: string | null = null

      await test.step(
        'Player visits the Campaign page and sees the Player view without Keeper controls',
        async () => {
          const nextCampaignRequest: Promise<Request> = session.page.waitForRequest((request) => {
            if (!request.url().includes(`/api/campaigns/${campaignId}`)) {
              return false
            }
            return (request.headers().authorization ?? '').toLowerCase().startsWith('bearer ')
          })

          await session.page.goto(`/campaigns/${campaignId}`)

          const authedRequest = await nextCampaignRequest
          capturedAuth = authedRequest.headers().authorization ?? null

          // The Keeper's token must not leak to a Player: the Player's view has no join-link
          // input and no Replace / Revoke controls, and the Invite endpoints refuse the Player.
          await expect(session.page.getByRole('heading', { name: 'At the table' })).toBeVisible()
          await expect(session.page.getByRole('heading', { name: 'Invite', exact: true })).toHaveCount(0)
          await expect(
            session.page.getByLabel(/share this join link with your players/i),
          ).toHaveCount(0)
          await expect(
            session.page.getByRole('button', { name: /revoke link/i }),
          ).toHaveCount(0)
          await expect(
            session.page.getByRole('button', { name: /replace link/i }),
          ).toHaveCount(0)
        },
      )

      await test.step('GET /api/campaigns/{id}/invite with the Player\'s real token returns 404', async () => {
        expect(capturedAuth, 'captured Authorization header').not.toBeNull()
        const response = await session.page.request.get(
          `https://localhost:5059/api/campaigns/${campaignId}/invite`,
          { headers: { Authorization: capturedAuth as string } },
        )
        expect(response.status()).toBe(404)
      })

      await test.step(
        'POST /api/campaigns/{id}/invite with the Player\'s real token returns 404',
        async () => {
          expect(capturedAuth, 'captured Authorization header').not.toBeNull()
          const response = await session.page.request.post(
            `https://localhost:5059/api/campaigns/${campaignId}/invite`,
            {
              headers: { Authorization: capturedAuth as string },
            },
          )
          expect(response.status()).toBe(404)
        },
      )
    } finally {
      await session.context.close()
    }
  })
})
