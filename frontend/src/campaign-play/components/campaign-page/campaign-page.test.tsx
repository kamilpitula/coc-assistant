import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { routerState } from '@/shared/test-support/routerMock'

import { CampaignPage } from './campaign-page'

// specs/campaign-overview/ux.md section 3: the overview, one layout for both roles; CO-UX-3.

const { mockUseCampaign } = vi.hoisted(() => ({ mockUseCampaign: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/components/attention-list/attention-list', () => ({
  AttentionList: ({ campaign }: { campaign: { role: string } }) => <h2>Needs your attention ({campaign.role})</h2>,
}))
vi.mock('@/campaign-play/components/campaign-table/campaign-table', () => ({
  CampaignTable: () => <h2>At the table</h2>,
}))
vi.mock('@/campaign-play/components/wall-preview/wall-preview', () => ({
  WallPreview: () => <h2>Wall</h2>,
}))

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

describe('CampaignPage (the overview)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
  })

  it.each([
    ['Keeper', keeperCampaign],
    ['Player', playerCampaign],
  ])('shows the %s what needs them, then who is at the table, then the Wall, and no Invite or Rules options (CO-UX-3, CO-UX-14)', (role, campaign) => {
    mockUseCampaign.mockReturnValue({ data: campaign })

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      `Needs your attention (${role})`,
      'At the table',
      'Wall',
    ])
  })

  // specs/campaign-overview/ux.md section 3: the Wall preview moves to a right column from 1024px.
  it('puts the Wall preview in a second column from the lg breakpoint', () => {
    mockUseCampaign.mockReturnValue({ data: keeperCampaign })

    const { container } = render(<CampaignPage campaignId="c1" />)

    expect(container.firstElementChild).toHaveClass('lg:grid-cols-[2fr_1fr]')
  })

  it.each([
    ['Keeper', keeperCampaign],
    ['Player', playerCampaign],
  ])('announces the status message to the %s above the sections', (_role, campaign) => {
    routerState.location.state = { statusMessage: 'Investigator approved.' }
    mockUseCampaign.mockReturnValue({ data: campaign })

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Investigator approved.')
  })

  it('renders nothing until the layout has the Campaign', () => {
    mockUseCampaign.mockReturnValue({ data: undefined })

    const { container } = render(<CampaignPage campaignId="c1" />)

    expect(container).toBeEmptyDOMElement()
  })
})
