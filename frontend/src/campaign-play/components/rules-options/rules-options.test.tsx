import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Campaign } from '@/campaign-play/types/Campaign'

import { RulesOptions } from './rules-options'

const { mockUseCampaign, mockUseChange, mockMutate } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseChange: vi.fn(),
  mockMutate: vi.fn(),
}))

vi.mock('@/campaign-play/hooks/useCampaign', () => ({
  useCampaign: mockUseCampaign,
  useChangeAllowedCreationMethods: mockUseChange,
}))

const campaign: Campaign = {
  id: 'c1',
  name: 'The Haunting',
  keeperAccountId: 'k1',
  playerLimit: 8,
  era: '1920s',
  allowedCreationMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
}

function campaignQuery(overrides: Record<string, unknown> = {}) {
  return { data: campaign, isPending: false, isError: false, ...overrides }
}

function changeMutation(overrides: Record<string, unknown> = {}) {
  return { mutate: mockMutate, isPending: false, isError: false, reset: vi.fn(), ...overrides }
}

/** specs/character-sheet/ux.md section 3.1 "Rules options". */
describe('RulesOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue(campaignQuery())
    mockUseChange.mockReturnValue(changeMutation())
  })

  it('shows the Era and creation methods to the Keeper under a "Rules options" heading', () => {
    render(<RulesOptions campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Rules options' })).toBeInTheDocument()
    expect(screen.getByText('Era: 1920s')).toBeInTheDocument()
    expect(
      screen.getByText('Creation methods: Standard rolling, Point buy, Quick fire'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit creation methods' })).toBeInTheDocument()
  })

  it('renders nothing for a caller who is not the Keeper', () => {
    mockUseCampaign.mockReturnValue(campaignQuery({ data: null }))

    const { container } = render(<RulesOptions campaignId="c1" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing while the Campaign is loading', () => {
    mockUseCampaign.mockReturnValue(campaignQuery({ data: undefined, isPending: true }))

    const { container } = render(<RulesOptions campaignId="c1" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('says the rules options could not be loaded when the request fails', () => {
    mockUseCampaign.mockReturnValue(campaignQuery({ data: undefined, isError: true }))

    render(<RulesOptions campaignId="c1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the rules options.")
  })

  it('opens a dialog with the current methods checked and the help text', async () => {
    const user = userEvent.setup()
    render(<RulesOptions campaignId="c1" />)

    await user.click(screen.getByRole('button', { name: 'Edit creation methods' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit creation methods' })
    expect(dialog).toHaveAccessibleDescription(
      'Players with a draft that uses a method you turn off will need to switch method before submitting.',
    )
    within(dialog)
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).toBeChecked())
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('saves the chosen methods, closes the dialog, returns focus, and announces the update', async () => {
    mockMutate.mockImplementation((_methods: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    )
    const user = userEvent.setup()
    render(<RulesOptions campaignId="c1" />)

    await user.click(screen.getByRole('button', { name: 'Edit creation methods' }))
    await user.click(screen.getByRole('checkbox', { name: /^quick fire/i }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockMutate).toHaveBeenCalledWith(['StandardRolling', 'PointBuy'], expect.anything())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit creation methods' })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('Creation methods updated.')
  })

  it('blocks saving with no methods and focuses the first checkbox', async () => {
    const user = userEvent.setup()
    render(<RulesOptions campaignId="c1" />)

    await user.click(screen.getByRole('button', { name: 'Edit creation methods' }))
    for (const checkbox of screen.getAllByRole('checkbox')) {
      await user.click(checkbox)
    }
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockMutate).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one creation method.')
    expect(screen.getByRole('checkbox', { name: /^standard rolling/i })).toHaveFocus()
  })

  it('discards unsaved changes on Cancel and returns focus to the edit button (A11Y-8)', async () => {
    const user = userEvent.setup()
    render(<RulesOptions campaignId="c1" />)

    await user.click(screen.getByRole('button', { name: 'Edit creation methods' }))
    await user.click(screen.getByRole('checkbox', { name: /^quick fire/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit creation methods' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Edit creation methods' }))
    expect(screen.getByRole('checkbox', { name: /^quick fire/i })).toBeChecked()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('closes on Escape (A11Y-8)', async () => {
    const user = userEvent.setup()
    render(<RulesOptions campaignId="c1" />)

    await user.click(screen.getByRole('button', { name: 'Edit creation methods' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit creation methods' })).toHaveFocus()
  })

  it('keeps the dialog open and explains a failed save', async () => {
    mockUseChange.mockReturnValue(changeMutation({ isError: true }))
    const user = userEvent.setup()
    render(<RulesOptions campaignId="c1" />)

    await user.click(screen.getByRole('button', { name: 'Edit creation methods' }))

    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
      "We couldn't save the creation methods. Try again.",
    )
  })
})
