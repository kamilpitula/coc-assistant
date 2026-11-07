import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CampaignHeader } from './campaign-header'

// specs/campaign-overview/ux.md section 2; CO-UX-1, CO-UX-2, CO-UX-11, CO-A11Y-2.
// specs/navigation/ux.md section 2; NAV-UX-1, NAV-UX-2, NAV-UX-3, NAV-A11Y-1, NAV-A11Y-3, NAV-A11Y-4, NAV-A11Y-5.

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

const campaign = { id: 'c1', name: 'Haunting of Corbitt House', era: '1920s' as const }

function navLinks() {
  return within(screen.getByRole('navigation', { name: 'Campaign' })).getAllByRole('link')
}

describe('CampaignHeader', () => {
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
      ['Scene History', '/campaigns/c1/scene-history', null],
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

    expect(navLinks().map((link) => link.getAttribute('aria-current'))).toEqual([null, null, null, null, 'page'])
  })

  // specs/scene-play/ux.md section 23; SPL-UX-61.
  it.each(['Keeper', 'Player'] as const)('marks Scene History as current on the Scene History page for the %s', (role) => {
    render(<CampaignHeader campaign={{ ...campaign, role }} section="scene-history" isOverview={false} hasActiveScene={false} />)

    const current = navLinks().filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual(['Scene History'])
  })

  // specs/campaign-wall/ux.md section 5; WL-UX-1.
  it.each(['Keeper', 'Player'] as const)('marks Wall as current on the Wall page for the %s', (role) => {
    render(<CampaignHeader campaign={{ ...campaign, role }} section="wall" isOverview={false} hasActiveScene={false} />)

    const current = navLinks().filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual(['Wall'])
  })

  it('gives a Player Overview, Active Scene, Scene History, and Wall, and no Settings (CO-UX-2, NAV-UX-1)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Player' }} section="overview" isOverview hasActiveScene={false} />)

    expect(navLinks().map((link) => link.textContent)).toEqual(['Overview', 'Active Scene', 'Scene History', 'Wall'])
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

  it('marks exactly one tab current on a non-overview page with Live on (NAV-UX-2, NAV-A11Y-1)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="wall" isOverview={false} hasActiveScene />)

    const current = screen.getByRole('navigation', { name: 'Campaign' }).querySelectorAll('[aria-current="page"]')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toBe('Wall')
  })

  it('scrolls the tab row so the current tab fits when the tab changes or Live appears (NAV-A11Y-4)', () => {
    const { rerender } = render(
      <CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview hasActiveScene={false} />,
    )
    const nav = screen.getByRole('navigation', { name: 'Campaign' })
    const wall = screen.getByRole('link', { name: 'Wall' })
    vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue({ left: 24, right: 296 } as unknown as DOMRect)
    vi.spyOn(wall, 'getBoundingClientRect').mockReturnValue({ left: 263, right: 323 } as unknown as DOMRect)

    expect(nav.scrollLeft).toBe(0)

    rerender(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="wall" isOverview={false} hasActiveScene={false} />)
    expect(nav.scrollLeft).toBe(27)

    // Live appears and the badge shifts Wall out of view again, so the row re-scrolls.
    vi.spyOn(wall, 'getBoundingClientRect').mockReturnValue({ left: 313, right: 373 } as unknown as DOMRect)
    rerender(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="wall" isOverview={false} hasActiveScene />)
    expect(nav.scrollLeft).toBe(104)

    // A current tab out of view to the left scrolls back the other way.
    const overview = screen.getByRole('link', { name: 'Overview' })
    vi.spyOn(overview, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 60 } as unknown as DOMRect)
    rerender(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview hasActiveScene />)
    expect(nav.scrollLeft).toBe(80)
  })
})
