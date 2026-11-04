import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CampaignHeader } from './campaign-header'

// specs/campaign-overview/ux.md section 2; CO-UX-1, CO-UX-2, CO-UX-11, CO-A11Y-2.
// specs/navigation/ux.md section 2; NAV-UX-1, NAV-UX-2, NAV-UX-3, NAV-A11Y-1, NAV-A11Y-3, NAV-A11Y-4, NAV-A11Y-5.

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

const campaign = { id: 'c1', name: 'Haunting of Corbitt House', era: '1920s' as const }

function navLinks() {
  return within(screen.getByRole('navigation', { name: 'Campaign' })).getAllByRole('link')
}

describe('CampaignHeader', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('shows the back link, the Campaign name as the page heading, and the Era on the overview (CO-UX-1)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview hasActiveScene={false} />)

    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute('href', '/campaigns')
    expect(screen.getByRole('heading', { level: 1, name: 'Haunting of Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('1920s')).toBeInTheDocument()
  })

  it('keeps the name as plain text on other Campaign pages, which have their own heading (CO-UX-11)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Player' }} section="overview" isOverview={false} hasActiveScene={false} />)

    expect(screen.getByText('Haunting of Corbitt House').tagName).toBe('P')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('gives the Keeper Overview, Active Scene, Wall, and Settings with Overview current (CO-UX-2, NAV-UX-1, NAV-UX-2)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview hasActiveScene={false} />)

    expect(navLinks().map((link) => [link.textContent, link.getAttribute('href'), link.getAttribute('aria-current')])).toEqual([
      ['Overview', '/campaigns/c1', 'page'],
      ['Active Scene', '/campaigns/c1/active-scene', null],
      ['Wall', '/campaigns/c1/wall', null],
      ['Settings', '/campaigns/c1/settings', null],
    ])
  })

  it('marks Active Scene as the only current tab on the Active Scene page (NAV-UX-2)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="active-scene" isOverview={false} hasActiveScene />)

    const current = navLinks().filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual(['Active SceneLive'])
  })

  it('marks Settings as current on the Settings page', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="settings" isOverview={false} hasActiveScene={false} />)

    expect(navLinks().map((link) => link.getAttribute('aria-current'))).toEqual([null, null, null, 'page'])
  })

  // specs/campaign-wall/ux.md section 5; WL-UX-1.
  it.each(['Keeper', 'Player'] as const)('marks Wall as current on the Wall page for the %s', (role) => {
    render(<CampaignHeader campaign={{ ...campaign, role }} section="wall" isOverview={false} hasActiveScene={false} />)

    const current = navLinks().filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual(['Wall'])
  })

  it('gives a Player Overview, Active Scene, and Wall, and no Settings (CO-UX-2, NAV-UX-1)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Player' }} section="overview" isOverview hasActiveScene={false} />)

    expect(navLinks().map((link) => link.textContent)).toEqual(['Overview', 'Active Scene', 'Wall'])
  })

  it('names the Active Scene link "Active Scene, live" with a visible "Live" while a Scene is Active (NAV-UX-3, NAV-A11Y-1)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="wall" isOverview={false} hasActiveScene />)

    const link = screen.getByRole('link', { name: 'Active Scene, live' })
    expect(link).toHaveAttribute('href', '/campaigns/c1/active-scene')
    expect(link).toHaveTextContent('Live')
  })

  it('names the Active Scene link "Active Scene" with no badge while no Scene is Active (NAV-UX-3)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Player' }} section="overview" isOverview hasActiveScene={false} />)

    expect(screen.getByRole('link', { name: 'Active Scene' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
    expect(screen.queryByText('Live')).not.toBeInTheDocument()
  })

  it('never announces the badge and never moves focus (NAV-A11Y-5)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview hasActiveScene />)

    expect(screen.getByRole('navigation', { name: 'Campaign' }).querySelector('[aria-live], [role="status"]')).toBeNull()
  })

  it('scrolls the current tab into view on mount and when the tab changes', () => {
    const scrollIntoView = Element.prototype.scrollIntoView as unknown as ReturnType<typeof vi.fn>
    const { rerender } = render(
      <CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview hasActiveScene={false} />,
    )

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
    expect(vi.mocked(scrollIntoView).mock.instances[0].textContent).toBe('Overview')

    rerender(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="wall" isOverview={false} hasActiveScene={false} />)
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(vi.mocked(scrollIntoView).mock.instances[1].textContent).toBe('Wall')
  })
})
