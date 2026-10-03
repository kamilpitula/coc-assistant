import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvitePlayersDialog } from './invite-dialog'

// specs/campaign-overview/ux.md section 6; CO-UX-10, CO-A11Y-6.

const { mockUseCampaignInvite, mockUseIssueInvite, mockIssue, mockRefetch, mockReset } = vi.hoisted(() => ({
  mockUseCampaignInvite: vi.fn(),
  mockUseIssueInvite: vi.fn(),
  mockIssue: vi.fn(),
  mockRefetch: vi.fn(),
  mockReset: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

vi.mock('@/campaign-play/hooks/useCampaignInvite', () => ({
  useCampaignInvite: mockUseCampaignInvite,
  useIssueInvite: mockUseIssueInvite,
}))

const JOIN_LINK = `${window.location.origin}/campaigns/join/abc123`

function inviteQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: { campaignId: 'c1', token: 'abc123', status: 'Active' },
    isPending: false,
    isError: false,
    isSuccess: true,
    refetch: mockRefetch,
    ...overrides,
  }
}

function issueMutation(overrides: Record<string, unknown> = {}) {
  return { mutate: mockIssue, reset: mockReset, isPending: false, isError: false, data: undefined, ...overrides }
}

async function openDialog() {
  const user = userEvent.setup()
  render(<InvitePlayersDialog campaignId="c1" />)
  await user.click(screen.getByRole('button', { name: 'Invite Players' }))
  return { user, dialog: await screen.findByRole('dialog', { name: 'Invite Players' }) }
}

describe('InvitePlayersDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaignInvite.mockReturnValue(inviteQuery())
    mockUseIssueInvite.mockReturnValue(issueMutation())
  })

  it('shows the active join link and starts focus on "Copy link" (CO-UX-10, CO-A11Y-6)', async () => {
    const { dialog } = await openDialog()

    expect(within(dialog).getByText('Anyone with this link can join until you replace or revoke it.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Join link')).toHaveValue(JOIN_LINK)
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Copy link' })).toHaveFocus())
    expect(mockIssue).not.toHaveBeenCalled()
  })

  it('copies the link and confirms with "Copied." (CO-UX-10)', async () => {
    const { user, dialog } = await openDialog()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()

    await user.click(within(dialog).getByRole('button', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith(JOIN_LINK)
    expect(await within(dialog).findByRole('status')).toHaveTextContent('Copied.')
  })

  it('asks to copy by hand and selects the link when copying fails', async () => {
    const { user, dialog } = await openDialog()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))

    await user.click(within(dialog).getByRole('button', { name: 'Copy link' }))

    expect(await within(dialog).findByRole('status')).toHaveTextContent("Couldn't copy. Select the link and copy it.")
    const input = within(dialog).getByLabelText<HTMLInputElement>('Join link')
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, JOIN_LINK.length])
  })

  it('issues an Invite once when none is active (CO-UX-10)', async () => {
    mockUseCampaignInvite.mockReturnValue(inviteQuery({ data: null }))

    await openDialog()

    expect(mockIssue).toHaveBeenCalledTimes(1)
  })

  it('shows the busy state while the join link is created', async () => {
    mockUseCampaignInvite.mockReturnValue(inviteQuery({ data: null }))
    mockUseIssueInvite.mockReturnValue(issueMutation({ isPending: true }))

    const { dialog } = await openDialog()

    expect(within(dialog).getByText('Creating a join link...')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Join link')).not.toBeInTheDocument()
  })

  it('shows the link the Invite was issued with before the Invite reloads', async () => {
    mockUseCampaignInvite.mockReturnValue(inviteQuery({ data: null }))
    mockUseIssueInvite.mockReturnValue(issueMutation({ data: { campaignId: 'c1', token: 'abc123', status: 'Active' } }))

    const { dialog } = await openDialog()

    expect(within(dialog).getByLabelText('Join link')).toHaveValue(JOIN_LINK)
  })

  it('offers to try again when the join link cannot be created', async () => {
    mockUseCampaignInvite.mockReturnValue(inviteQuery({ data: null }))
    mockUseIssueInvite.mockReturnValue(issueMutation({ isError: true }))

    const { user, dialog } = await openDialog()

    expect(within(dialog).getByText("We couldn't create a join link.")).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Try again' }))
    expect(mockReset).toHaveBeenCalled()
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('links to Settings for replacing or revoking the link', async () => {
    const { dialog } = await openDialog()

    expect(within(dialog).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/campaigns/c1/settings')
  })

  it('closes with "Done" and returns focus to its trigger (CO-A11Y-6)', async () => {
    const { user, dialog } = await openDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Done' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Invite Players' })).toHaveFocus()
  })
})
