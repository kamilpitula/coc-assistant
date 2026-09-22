import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CreateCampaignForm } from './create-campaign-form'

const { mockMutate, mockUseCreateCampaign } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockUseCreateCampaign: vi.fn(),
}))

vi.mock('@/campaign-play/hooks/useCreateCampaign', () => ({
  useCreateCampaign: mockUseCreateCampaign,
}))

function mutationState(overrides: Record<string, unknown> = {}) {
  return {
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    ...overrides,
  }
}

describe('CreateCampaignForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a Campaign name field and a create button', () => {
    mockUseCreateCampaign.mockReturnValue(mutationState())

    render(<CreateCampaignForm />)

    expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create campaign/i })).toBeEnabled()
  })

  it('shows a validation error and does not submit when the name is blank', async () => {
    mockUseCreateCampaign.mockReturnValue(mutationState())
    const user = userEvent.setup()

    render(<CreateCampaignForm />)
    await user.click(screen.getByRole('button', { name: /create campaign/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/campaign name is required/i)
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('creates the Campaign with the entered name on submit', async () => {
    mockUseCreateCampaign.mockReturnValue(mutationState())
    const user = userEvent.setup()

    render(<CreateCampaignForm />)
    await user.type(screen.getByLabelText(/campaign name/i), 'The Haunting')
    await user.click(screen.getByRole('button', { name: /create campaign/i }))

    expect(mockMutate).toHaveBeenCalledWith('The Haunting')
  })

  it('confirms the Keeper owns the new Campaign after a successful create', () => {
    mockUseCreateCampaign.mockReturnValue(
      mutationState({
        isSuccess: true,
        data: { id: '1', name: 'The Haunting', keeperAccountId: 'keeper-1' },
      }),
    )

    render(<CreateCampaignForm />)

    expect(screen.getByRole('status')).toHaveTextContent(/the haunting/i)
    expect(screen.getByRole('status')).toHaveTextContent(/keeper/i)
  })
})
