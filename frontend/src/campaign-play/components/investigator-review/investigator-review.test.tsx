import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvestigatorConflictError } from '@/campaign-play/services/investigatorApi'
import { keeperInvestigator, problem } from '@/campaign-play/test-support/characterSheetFixtures'
import type { KeeperInvestigator } from '@/campaign-play/types/Investigator'

import { InvestigatorReview } from './investigator-review'

const { mockUseInvestigator, mockApprove, mockRequestChanges, mockRefetch } = vi.hoisted(() => ({
  mockUseInvestigator: vi.fn(),
  mockApprove: vi.fn(),
  mockRequestChanges: vi.fn(),
  mockRefetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useKeeperInvestigators', () => ({
  useKeeperInvestigator: mockUseInvestigator,
  useApproveInvestigator: () => ({ mutateAsync: mockApprove, isPending: false }),
  useRequestChanges: () => ({ mutateAsync: mockRequestChanges, isPending: false }),
}))

function withInvestigator(data: KeeperInvestigator | null) {
  mockUseInvestigator.mockReturnValue({ data, isPending: false, isError: false, refetch: mockRefetch })
}

/** specs/character-sheet/ux.md section 7.1 (Keeper review screen); UX-14, UX-15, A11Y-1, A11Y-5. */
describe('InvestigatorReview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('UX-18: shows the not-found page for an Investigator outside the Keeper\'s visibility', () => {
    withInvestigator(null)

    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeInTheDocument()
  })

  it('titles the screen with the Investigator, names the Player, and shows the status, sheet, and dice results', () => {
    withInvestigator(keeperInvestigator())

    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    const heading = screen.getByRole('heading', { level: 1, name: 'Harvey Walters' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('Player: Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dice results' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })

  it('lists the warnings under "Worth checking"', () => {
    withInvestigator(
      keeperInvestigator({
        warnings: [problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40. Check with your Keeper.', 'Warning')],
      }),
    )

    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    const heading = screen.getByRole('heading', { name: 'Worth checking' })
    expect(within(heading.parentElement!).getByText('INT is below the recommended 40. Check with your Keeper.')).toBeInTheDocument()
  })

  it('UX-14: approves on one click, removes the actions, and focuses the announcement', async () => {
    withInvestigator(keeperInvestigator())
    mockApprove.mockResolvedValue(keeperInvestigator({ status: 'Approved' }))
    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    const status = await screen.findByText('Harvey Walters is approved and ready for play.')
    expect(status).toHaveFocus()
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument()
  })

  it('UX-15: sends a Change Request, then shows "Changes requested" and "Sent to the Player."', async () => {
    withInvestigator(keeperInvestigator())
    mockRequestChanges.mockResolvedValue(keeperInvestigator({ status: 'ChangesRequested', changeRequestComment: 'Lower it' }))
    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))
    await userEvent.type(screen.getByLabelText('What should the Player change?'), 'Lower it')
    await userEvent.click(screen.getByRole('button', { name: 'Send to Player' }))

    expect(mockRequestChanges).toHaveBeenCalledWith('Lower it')
    expect(await screen.findByText('Sent to the Player.')).toBeInTheDocument()
    expect(screen.getByText('Changes requested')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })

  it('offers "Reload" when the Investigator changed since the screen opened', async () => {
    withInvestigator(keeperInvestigator())
    mockApprove.mockRejectedValue(new InvestigatorConflictError())
    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(await screen.findByText('This Investigator changed since you opened it.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('reports any other failure', async () => {
    withInvestigator(keeperInvestigator())
    mockApprove.mockRejectedValue(new Error('Failed (500)'))
    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    expect(await screen.findByText("We couldn't update this Investigator. Try again.")).toBeInTheDocument()
  })

  it('shows no actions once the Investigator is not Submitted', () => {
    withInvestigator(keeperInvestigator({ status: 'Approved' }))

    render(<InvestigatorReview campaignId="c1" investigatorId="i1" />)

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})
