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

const ALL_CREATION_METHODS = ['StandardRolling', 'PointBuy', 'QuickFire']

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

    expect(mockMutate).toHaveBeenCalledWith({
      name: 'The Haunting',
      playerLimit: 8,
      era: '1920s',
      allowedCreationMethods: ALL_CREATION_METHODS,
    })
  })

  it('offers a Player limit field that defaults to eight', () => {
    mockUseCreateCampaign.mockReturnValue(mutationState())

    render(<CreateCampaignForm />)

    expect(screen.getByLabelText(/player limit/i)).toHaveValue(8)
  })

  it('creates the Campaign with the Player limit the Keeper configured', async () => {
    mockUseCreateCampaign.mockReturnValue(mutationState())
    const user = userEvent.setup()

    render(<CreateCampaignForm />)
    await user.type(screen.getByLabelText(/campaign name/i), 'The Haunting')
    await user.clear(screen.getByLabelText(/player limit/i))
    await user.type(screen.getByLabelText(/player limit/i), '3')
    await user.click(screen.getByRole('button', { name: /create campaign/i }))

    expect(mockMutate).toHaveBeenCalledWith({
      name: 'The Haunting',
      playerLimit: 3,
      era: '1920s',
      allowedCreationMethods: ALL_CREATION_METHODS,
    })
  })

  it.each(['0', '17', ''])(
    'shows a validation error and does not submit when the Player limit is "%s"',
    async (playerLimit) => {
      mockUseCreateCampaign.mockReturnValue(mutationState())
      const user = userEvent.setup()

      render(<CreateCampaignForm />)
      await user.type(screen.getByLabelText(/campaign name/i), 'The Haunting')
      await user.clear(screen.getByLabelText(/player limit/i))
      if (playerLimit) {
        await user.type(screen.getByLabelText(/player limit/i), playerLimit)
      }
      await user.click(screen.getByRole('button', { name: /create campaign/i }))

      expect(screen.getByRole('alert')).toHaveTextContent(/player limit must be between 1 and 16/i)
      expect(mockMutate).not.toHaveBeenCalled()
    },
  )

  it('confirms the Keeper owns the new Campaign after a successful create', () => {
    mockUseCreateCampaign.mockReturnValue(
      mutationState({
        isSuccess: true,
        data: {
          id: '1',
          name: 'The Haunting',
          keeperAccountId: 'keeper-1',
          playerLimit: 5,
          era: '1920s',
          allowedCreationMethods: ALL_CREATION_METHODS,
        },
      }),
    )

    render(<CreateCampaignForm />)

    expect(screen.getByRole('status')).toHaveTextContent(/the haunting/i)
    expect(screen.getByRole('status')).toHaveTextContent(/up to 5 players/i)
    expect(screen.getByRole('status')).toHaveTextContent(/keeper/i)
  })

  describe('Rules options (specs/character-sheet/ux.md section 2)', () => {
    it('UX-1: submits the 1920s Era and all three creation methods when Rules options is never opened', async () => {
      mockUseCreateCampaign.mockReturnValue(mutationState())
      const user = userEvent.setup()

      render(<CreateCampaignForm />)
      expect(screen.getByRole('button', { name: /^rules options/i })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
      await user.type(screen.getByLabelText(/campaign name/i), 'The Haunting')
      await user.click(screen.getByRole('button', { name: /create campaign/i }))

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ era: '1920s', allowedCreationMethods: ALL_CREATION_METHODS }),
      )
    })

    it('submits only the creation methods the Keeper left checked', async () => {
      mockUseCreateCampaign.mockReturnValue(mutationState())
      const user = userEvent.setup()

      render(<CreateCampaignForm />)
      await user.type(screen.getByLabelText(/campaign name/i), 'The Haunting')
      await user.click(screen.getByRole('button', { name: /^rules options/i }))
      await user.click(screen.getByRole('checkbox', { name: /^standard rolling/i }))
      await user.click(screen.getByRole('button', { name: /create campaign/i }))

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ allowedCreationMethods: ['PointBuy', 'QuickFire'] }),
      )
    })

    it('UX-2: blocks creation when every method is unchecked and focuses the first checkbox', async () => {
      mockUseCreateCampaign.mockReturnValue(mutationState())
      const user = userEvent.setup()

      render(<CreateCampaignForm />)
      await user.type(screen.getByLabelText(/campaign name/i), 'The Haunting')
      await user.click(screen.getByRole('button', { name: /^rules options/i }))
      for (const checkbox of screen.getAllByRole('checkbox')) {
        await user.click(checkbox)
      }
      await user.click(screen.getByRole('button', { name: /create campaign/i }))

      expect(mockMutate).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one creation method.')
      expect(screen.getByRole('checkbox', { name: /^standard rolling/i })).toHaveFocus()
    })

    it('UX-2: expands a collapsed Rules options section to show the error and focus the first checkbox', async () => {
      mockUseCreateCampaign.mockReturnValue(mutationState())
      const user = userEvent.setup()

      render(<CreateCampaignForm />)
      await user.type(screen.getByLabelText(/campaign name/i), 'The Haunting')
      const trigger = screen.getByRole('button', { name: /^rules options/i })
      await user.click(trigger)
      for (const checkbox of screen.getAllByRole('checkbox')) {
        await user.click(checkbox)
      }
      await user.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await user.click(screen.getByRole('button', { name: /create campaign/i }))

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('checkbox', { name: /^standard rolling/i })).toHaveFocus()
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })
})
