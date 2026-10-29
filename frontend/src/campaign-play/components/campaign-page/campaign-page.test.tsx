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
vi.mock('@/scene-play/components/active-scene-card/active-scene-card', () => ({
  ActiveSceneCard: ({ isKeeper }: { isKeeper: boolean }) => <h2>Active Scene ({isKeeper ? 'Keeper' : 'Player'})</h2>,
}))
vi.mock('@/campaign-play/components/campaign-table/campaign-table', () => ({
  CampaignTable: () => <h2>At the table</h2>,
}))
vi.mock('@/campaign-play/components/wall-preview/wall-preview', () => ({
  WallPreview: () => <h2>Wall</h2>,
}))
vi.mock('@/scenario-preparation/components/scenario-list-section/scenario-list-section', () => ({
  ScenarioListSection: () => <h2>Scenarios</h2>,
}))

vi.mock('@/scenario-preparation/components/non-player-entity-summary-section/non-player-entity-summary-section', () => ({
  NonPlayerEntitySummarySection: () => <h2>Non-Player Entities</h2>,
}))
vi.mock('@/scenario-preparation/components/item-summary-section/item-summary-section', () => ({
  ItemSummarySection: () => <h2>Items</h2>,
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

  it('shows the Player what needs them, then the Active Scene, then who is at the table, then the Wall, and no Scenarios, Non-Player Entities, Items, Invite or Rules options (CO-UX-3, CO-UX-14, SPL-UX-14, SP-UX-9, SP-UX-28, SP-UX-90)', () => {
    mockUseCampaign.mockReturnValue({ data: playerCampaign })

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Needs your attention (Player)',
      'Active Scene (Player)',
      'At the table',
      'Wall',
    ])
  })

  // specs/campaign-overview/ux.md section 3 and specs/scenario-preparation/ux.md section 2: the Keeper's Scenarios follow "At the table".
  it('shows the Keeper what needs them, then the Active Scene, then who is at the table, then the Scenarios, then the Non-Player Entities, then the Items, then the Wall (CO-UX-3, SPL-UX-14, SP-UX-1, SP-UX-28, SP-UX-90)', () => {
    mockUseCampaign.mockReturnValue({ data: keeperCampaign })

    render(<CampaignPage campaignId="c1" />)

    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Needs your attention (Keeper)',
      'Active Scene (Keeper)',
      'At the table',
      'Scenarios',
      'Non-Player Entities',
      'Items',
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
