import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { JoinCampaign } from './join-campaign'

const { mockMutate, mockUseJoinCampaign } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockUseJoinCampaign: vi.fn(),
}))

vi.mock('@/campaign-play/hooks/useJoinCampaign', () => ({
  useJoinCampaign: mockUseJoinCampaign,
}))

function mutationState(overrides: Record<string, unknown> = {}) {
  return { mutate: mockMutate, isPending: false, isError: false, data: undefined, ...overrides }
}

describe('JoinCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('joins the Campaign with the invite token when the button is clicked', async () => {
    mockUseJoinCampaign.mockReturnValue(mutationState())
    const user = userEvent.setup()

    render(<JoinCampaign token="tok-abc" />)
    await user.click(screen.getByRole('button', { name: /join this campaign/i }))

    expect(mockMutate).toHaveBeenCalledWith('tok-abc')
  })

  it('confirms membership after a successful join', () => {
    mockUseJoinCampaign.mockReturnValue(
      mutationState({ data: { outcome: 'Joined', campaignId: 'c-1' } }),
    )

    render(<JoinCampaign token="tok-abc" />)

    expect(screen.getByRole('status')).toHaveTextContent(/joined the campaign/i)
  })

  it('tells the Player the Campaign is full when the limit is reached', () => {
    mockUseJoinCampaign.mockReturnValue(
      mutationState({ data: { outcome: 'LimitReached', campaignId: null } }),
    )

    render(<JoinCampaign token="tok-abc" />)

    expect(screen.getByRole('alert')).toHaveTextContent(/full/i)
  })

  it('tells the Player the invite is no longer valid', () => {
    mockUseJoinCampaign.mockReturnValue(
      mutationState({ data: { outcome: 'InvalidInvite', campaignId: null } }),
    )

    render(<JoinCampaign token="tok-abc" />)

    expect(screen.getByRole('alert')).toHaveTextContent(/no longer valid/i)
  })

  it('reports a generic error when the join request fails', () => {
    mockUseJoinCampaign.mockReturnValue(mutationState({ isError: true }))

    render(<JoinCampaign token="tok-abc" />)

    expect(screen.getByRole('alert')).toHaveTextContent(/could not join/i)
  })
})
