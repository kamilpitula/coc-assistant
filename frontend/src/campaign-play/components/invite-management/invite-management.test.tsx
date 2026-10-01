import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { InviteManagement } from './invite-management'

const {
  mockUseCampaignInvite,
  mockUseIssueInvite,
  mockUseReplaceInvite,
  mockUseRevokeInvite,
  mockIssue,
  mockReplace,
  mockRevoke,
} = vi.hoisted(() => ({
  mockUseCampaignInvite: vi.fn(),
  mockUseIssueInvite: vi.fn(),
  mockUseReplaceInvite: vi.fn(),
  mockUseRevokeInvite: vi.fn(),
  mockIssue: vi.fn(),
  mockReplace: vi.fn(),
  mockRevoke: vi.fn(),
}))

vi.mock('@/campaign-play/hooks/useCampaignInvite', () => ({
  useCampaignInvite: mockUseCampaignInvite,
  useIssueInvite: mockUseIssueInvite,
  useReplaceInvite: mockUseReplaceInvite,
  useRevokeInvite: mockUseRevokeInvite,
}))

function queryState(overrides: Record<string, unknown> = {}) {
  return { data: undefined, isPending: false, isError: false, ...overrides }
}

function mutationState(mutate: ReturnType<typeof vi.fn>, overrides: Record<string, unknown> = {}) {
  return { mutate, isPending: false, isError: false, ...overrides }
}

describe('InviteManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseIssueInvite.mockReturnValue(mutationState(mockIssue))
    mockUseReplaceInvite.mockReturnValue(mutationState(mockReplace))
    mockUseRevokeInvite.mockReturnValue(mutationState(mockRevoke))
  })

  it('shows an issue button when there is no active invite', () => {
    mockUseCampaignInvite.mockReturnValue(queryState({ data: null }))

    render(<InviteManagement campaignId="c-1" />)

    expect(screen.getByRole('button', { name: /issue invite link/i })).toBeEnabled()
  })

  it('issues an invite when the issue button is clicked', async () => {
    mockUseCampaignInvite.mockReturnValue(queryState({ data: null }))
    const user = userEvent.setup()

    render(<InviteManagement campaignId="c-1" />)
    await user.click(screen.getByRole('button', { name: /issue invite link/i }))

    expect(mockIssue).toHaveBeenCalledTimes(1)
  })

  it('shows the shareable join link when an invite is active', () => {
    mockUseCampaignInvite.mockReturnValue(
      queryState({ data: { campaignId: 'c-1', token: 'tok-123', status: 'Active' } }),
    )

    render(<InviteManagement campaignId="c-1" />)

    const link = screen.getByLabelText(/share this join link/i) as HTMLInputElement
    expect(link.value).toContain('/campaigns/join/tok-123')
  })

  it('replaces and revokes the invite via their buttons', async () => {
    mockUseCampaignInvite.mockReturnValue(
      queryState({ data: { campaignId: 'c-1', token: 'tok-123', status: 'Active' } }),
    )
    const user = userEvent.setup()

    render(<InviteManagement campaignId="c-1" />)
    await user.click(screen.getByRole('button', { name: /replace link/i }))
    await user.click(screen.getByRole('button', { name: /revoke link/i }))

    expect(mockReplace).toHaveBeenCalledTimes(1)
    expect(mockRevoke).toHaveBeenCalledTimes(1)
  })

  it('reports an error when invite management fails', () => {
    mockUseCampaignInvite.mockReturnValue(queryState({ data: null, isError: true }))

    render(<InviteManagement campaignId="c-1" />)

    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
  })
})
