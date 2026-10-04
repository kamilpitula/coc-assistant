import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { keeperListItem, playerListItem } from '@/campaign-list/test-support/campaignListFixtures'
import type { CampaignListItem as CampaignListItemData } from '@/campaign-list/types/CampaignListItem'

import { CampaignListItem } from './campaign-list-item'

// specs/campaign-list/ux.md section 3 (CL-UX-3, CL-UX-4, CL-UX-5; CL-A11Y-1, CL-A11Y-3, CL-A11Y-5).

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

function renderItem(item: CampaignListItemData) {
  render(
    <ul>
      <CampaignListItem item={item} />
    </ul>,
  )
  return screen.getByRole('listitem')
}

describe('CampaignListItem', () => {
  it('has exactly one link, named by the Campaign name inside an h3, to the Campaign overview (CL-UX-5)', () => {
    const item = renderItem(keeperListItem)

    const link = within(item).getByRole('link')
    expect(link).toHaveAccessibleName('The Haunting')
    expect(link).toHaveAttribute('href', '/campaigns/c1')
    expect(within(item).getByRole('heading', { level: 3 })).toContainElement(link)
  })

  it('shows the Era, Players with the limit, the Approved count, and the reviews awaiting the Keeper (CL-UX-3)', () => {
    const item = renderItem(keeperListItem)

    expect(within(item).getByText('1920s')).toBeInTheDocument()
    expect(within(item).getByText('3 of 8 Players, 1 Investigator approved')).toBeInTheDocument()
    expect(within(item).getByText('2 awaiting review')).toBeInTheDocument()
    expect(item.querySelectorAll('svg:not([aria-hidden="true"])')).toHaveLength(0)
  })

  it('shows no review badge when nothing awaits review', () => {
    const item = renderItem({ ...keeperListItem, awaitingReviewCount: 0 })

    expect(within(item).queryByText(/awaiting review/)).not.toBeInTheDocument()
  })

  it('shows the Keeper, Players without a limit, and the own Investigator status and name (CL-UX-4)', () => {
    const item = renderItem(playerListItem)

    expect(within(item).getByText('1920s, Keeper: Anna K.')).toBeInTheDocument()
    expect(within(item).getByText('5 Players, 4 Investigators approved')).toBeInTheDocument()
    expect(within(item).getByText('Changes requested')).toBeInTheDocument()
    expect(within(item).getByText('Your Investigator: Harvey Walters')).toBeInTheDocument()
    expect(within(item).queryByText(/ of /)).not.toBeInTheDocument()
  })

  it('says "No Investigator yet" and omits the own Investigator line when the Player has none', () => {
    const item = renderItem({ ...playerListItem, myInvestigator: null })

    expect(within(item).getByText('No Investigator yet')).toBeInTheDocument()
    expect(within(item).queryByText(/Your Investigator/)).not.toBeInTheDocument()
  })
})
