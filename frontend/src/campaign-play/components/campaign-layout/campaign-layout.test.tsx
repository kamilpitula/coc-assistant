import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CampaignLayout } from './campaign-layout'

// specs/campaign-overview/ux.md section 2, header states; specs/character-sheet/ux.md section 3.3.

const { mockUseCampaign, mockRefetch } = vi.hoisted(() => ({ mockUseCampaign: vi.fn(), mockRefetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/shared/components/header/header', () => ({ Header: () => <div>Site header</div> }))

function query(data: unknown, overrides: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, refetch: mockRefetch, ...overrides }
}

const campaign = { id: 'c1', name: 'Haunting of Corbitt House', era: '1920s', allowedCreationMethods: ['PointBuy'], role: 'Player' }

function renderLayout() {
  return render(
    <CampaignLayout campaignId="c1" section="overview" isOverview>
      <p>Page content</p>
    </CampaignLayout>,
  )
}

describe('CampaignLayout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the site header, the Campaign header, and the page once the Campaign loads (CO-UX-1)', () => {
    mockUseCampaign.mockReturnValue(query(campaign))

    renderLayout()

    expect(screen.getByText('Site header')).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Haunting of Corbitt House' }))
    expect(screen.getByRole('navigation', { name: 'Campaign' })).toBeInTheDocument()
    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('shows a busy placeholder while the Campaign loads', () => {
    mockUseCampaign.mockReturnValue(query(undefined, { isPending: true }))

    renderLayout()

    expect(screen.getByRole('main').querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByText('Page content')).not.toBeInTheDocument()
  })

  it('replaces the header and the page with "Try again" when the Campaign cannot be loaded', async () => {
    mockUseCampaign.mockReturnValue(query(undefined, { isError: true }))

    renderLayout()

    expect(screen.getByText("We couldn't load this Campaign.")).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Campaign' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('replaces the header and the page with the not-found page for a non-member', () => {
    mockUseCampaign.mockReturnValue(query(null))

    renderLayout()

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Campaign" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute('href', '/campaigns')
    expect(screen.queryByRole('navigation', { name: 'Campaign' })).not.toBeInTheDocument()
    expect(screen.queryByText('Page content')).not.toBeInTheDocument()
  })
})
