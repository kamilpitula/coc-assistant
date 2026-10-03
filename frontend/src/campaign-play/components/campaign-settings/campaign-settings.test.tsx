import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CampaignSettings } from './campaign-settings'

// specs/campaign-overview/ux.md section 8; CO-UX-3, CO-UX-12.

const { mockUseCampaign } = vi.hoisted(() => ({ mockUseCampaign: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/components/invite-management/invite-management', () => ({
  InviteManagement: () => <h2>Invite</h2>,
}))
vi.mock('@/campaign-play/components/rules-options/rules-options', () => ({
  RulesOptions: () => <h2>Rules options</h2>,
}))

const campaign = { id: 'c1', name: 'Corbitt House', era: '1920s', allowedCreationMethods: ['PointBuy'] }

describe('CampaignSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gives the Keeper the Invite and then the Rules options under the "Settings" heading (CO-UX-3)', () => {
    mockUseCampaign.mockReturnValue({ data: { ...campaign, keeperAccountId: 'k1', playerLimit: 8, role: 'Keeper' } })

    render(<CampaignSettings campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Invite',
      'Rules options',
    ])
  })

  it('shows a Player that the page could not be found, without Invite or rules data (CO-UX-12)', () => {
    mockUseCampaign.mockReturnValue({ data: { ...campaign, role: 'Player' } })

    render(<CampaignSettings campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that page" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/campaigns/c1')
    expect(screen.queryByRole('heading', { name: 'Invite' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Rules options' })).not.toBeInTheDocument()
  })
})
