import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routerState } from '@/shared/test-support/routerMock'

import { CampaignPage } from './campaign-page'

const { mockUseCampaign, mockRefetch } = vi.hoisted(() => ({ mockUseCampaign: vi.fn(), mockRefetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/components/invite-management/invite-management', () => ({
  InviteManagement: () => <h1>Campaign Invite</h1>,
}))
vi.mock('@/campaign-play/components/rules-options/rules-options', () => ({
  RulesOptions: () => <h2>Rules options</h2>,
}))
vi.mock('@/campaign-play/components/investigator-list/investigator-list', () => ({
  InvestigatorList: () => <h2>Investigators</h2>,
}))
vi.mock('@/campaign-play/components/campaign-presence/campaign-presence', () => ({
  CampaignPresence: () => <h2>At the table</h2>,
}))
vi.mock('@/campaign-play/components/your-investigator-card/your-investigator-card', () => ({
  YourInvestigatorCard: () => <h2>Your Investigator</h2>,
}))

function query(data: unknown, overrides: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, refetch: mockRefetch, ...overrides }
}

const keeperCampaign = {
  id: 'c1',
  name: 'The Haunting',
  keeperAccountId: 'k1',
  playerLimit: 8,
  era: '1920s',
  allowedCreationMethods: ['PointBuy'],
  role: 'Keeper',
}

const playerCampaign = { id: 'c1', name: 'The Haunting', era: '1920s', allowedCreationMethods: ['PointBuy'], role: 'Player' }

/** specs/character-sheet/ux.md section 3: the Campaign page renders by role. */
describe('CampaignPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
  })

  it('shows the Keeper who is at the table first, then the Campaign Invite, Investigators, Rules options, and no Player card', () => {
    mockUseCampaign.mockReturnValue(query(keeperCampaign))

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'At the table',
      'Campaign Invite',
      'Investigators',
      'Rules options',
    ])
    expect(screen.queryByRole('heading', { name: 'Your Investigator' })).not.toBeInTheDocument()
  })

  it('shows a Player the read-only Campaign view: its name and the Your Investigator card, without Keeper controls', () => {
    mockUseCampaign.mockReturnValue(query(playerCampaign))

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'The Haunting' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your Investigator' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Campaign Invite' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Investigators' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Rules options' })).not.toBeInTheDocument()
  })

  it('shows a Player who is at the table below the Campaign name and above Your Investigator (ux.md section 1)', () => {
    mockUseCampaign.mockReturnValue(query(playerCampaign))

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'The Haunting',
      'At the table',
      'Your Investigator',
    ])
  })

  it('announces the status message passed by the page the Player came from', () => {
    routerState.location.state = { statusMessage: 'Draft saved.' }
    mockUseCampaign.mockReturnValue(query(playerCampaign))

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Draft saved.')
  })

  it('UX-21, PR-UX-12: tells a non-member the Campaign could not be found, with a link back to Campaigns and no roster', () => {
    mockUseCampaign.mockReturnValue(query(null))

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Campaign" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute('href', '/campaigns')
    expect(screen.queryByRole('heading', { name: 'At the table' })).not.toBeInTheDocument()
  })

  it('shows a busy skeleton while the Campaign loads', () => {
    mockUseCampaign.mockReturnValue(query(undefined, { isPending: true }))

    const { container } = render(<CampaignPage campaignId="c1" />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers "Try again" when the Campaign cannot be loaded', async () => {
    mockUseCampaign.mockReturnValue(query(undefined, { isError: true }))

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getByText("We couldn't load this Campaign.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalled()
  })
})
