import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CampaignHeader } from './campaign-header'

// specs/campaign-overview/ux.md section 2; CO-UX-1, CO-UX-2, CO-UX-11, CO-A11Y-1, CO-A11Y-2.

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

const campaign = { id: 'c1', name: 'Haunting of Corbitt House', era: '1920s' as const }

function navLinks() {
  return within(screen.getByRole('navigation', { name: 'Campaign' })).getAllByRole('link')
}

describe('CampaignHeader', () => {
  it('shows the back link, the Campaign name as the page heading, and the Era on the overview (CO-UX-1)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview />)

    expect(screen.getByRole('link', { name: 'Back to Campaigns' })).toHaveAttribute('href', '/campaigns')
    expect(screen.getByRole('heading', { level: 1, name: 'Haunting of Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('1920s')).toBeInTheDocument()
  })

  it('keeps the name as plain text on other Campaign pages, which have their own heading (CO-UX-11)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Player' }} section="overview" isOverview={false} />)

    expect(screen.getByText('Haunting of Corbitt House').tagName).toBe('P')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('gives the Keeper Overview and Settings, with Overview current (CO-UX-2, CO-A11Y-2)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="overview" isOverview />)

    expect(navLinks().map((link) => [link.textContent, link.getAttribute('href'), link.getAttribute('aria-current')])).toEqual([
      ['Overview', '/campaigns/c1', 'page'],
      ['Settings', '/campaigns/c1/settings', null],
    ])
  })

  it('marks Settings as current on the Settings page', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Keeper' }} section="settings" isOverview={false} />)

    expect(navLinks().map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page'])
  })

  it('gives a Player only Overview (CO-UX-2)', () => {
    render(<CampaignHeader campaign={{ ...campaign, role: 'Player' }} section="overview" isOverview />)

    expect(navLinks().map((link) => link.textContent)).toEqual(['Overview'])
  })
})
