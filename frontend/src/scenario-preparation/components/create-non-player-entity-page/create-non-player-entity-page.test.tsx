import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityValidationError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { CreateNonPlayerEntityPage } from './create-non-player-entity-page'

// specs/scenario-preparation/ux.md section 24; SP-UX-31, SP-UX-32, SP-UX-39, SP-UX-40, SP-A11Y-18, SP-A11Y-19.

const { mockUseCampaign, mockUseCreate, mutate } = vi.hoisted(() => ({ mockUseCampaign: vi.fn(), mockUseCreate: vi.fn(), mutate: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({ useCreateHumanNpc: mockUseCreate }))

function creation(overrides: Record<string, unknown> = {}) {
  return { mutate, isPending: false, isError: false, error: null, ...overrides }
}

describe('CreateNonPlayerEntityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseCreate.mockReturnValue(creation())
  })

  it('shows the heading, a Type fieldset with no selection, the type-change hint, and a Cancel link', () => {
    render(<CreateNonPlayerEntityPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Create Non-Player Entity' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Type' })).toHaveAccessibleDescription("You can't change the type later.")
    expect(screen.getByRole('radio', { name: 'Human NPC' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Mythos Creature' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities')
  })

  it('shows Age only while Human NPC is chosen (SP-UX-31)', async () => {
    render(<CreateNonPlayerEntityPage campaignId="c1" />)
    expect(screen.queryByLabelText('Age')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Human NPC' }))

    expect(screen.getByLabelText('Age')).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByText('Any age from 0 to 150.')).toBeInTheDocument()
  })

  it('creates the Human NPC and opens its page with "Human NPC created." (SP-UX-32)', async () => {
    mutate.mockImplementation((_values, options) => options.onSuccess({ id: 'h1' }))
    render(<CreateNonPlayerEntityPage campaignId="c1" />)

    await userEvent.click(screen.getByRole('radio', { name: 'Human NPC' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Mr. Knott')
    await userEvent.type(screen.getByLabelText('Age'), '62')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(mutate).toHaveBeenCalledWith({ name: 'Mr. Knott', age: 62 }, expect.any(Object))
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/human-npcs/$humanNpcId',
      params: { campaignId: 'c1', humanNpcId: 'h1' },
      state: { statusMessage: 'Human NPC created.' },
    })
  })

  it('refuses an empty form without a request, names each problem, and focuses the first invalid field (SP-UX-31)', async () => {
    render(<CreateNonPlayerEntityPage campaignId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Choose Human NPC or Mythos Creature.')).toBeInTheDocument()
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Human NPC' })).toHaveFocus()
  })

  it('explains a missing age and a bad age next to Age with aria-invalid', async () => {
    render(<CreateNonPlayerEntityPage campaignId="c1" />)
    await userEvent.click(screen.getByRole('radio', { name: 'Human NPC' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Mr. Knott')

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Enter an age.')).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toHaveFocus()

    await userEvent.type(screen.getByLabelText('Age'), '151')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByText('Enter an age from 0 to 150, in whole years.')).toBeInTheDocument()
    expect(screen.getByLabelText('Age')).toHaveAttribute('aria-invalid', 'true')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('disables the button and reads "Creating..." while the request is in flight (SP-UX-40)', () => {
    mockUseCreate.mockReturnValue(creation({ isPending: true }))

    render(<CreateNonPlayerEntityPage campaignId="c1" />)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('keeps the input and shows an alert when the create fails', () => {
    mockUseCreate.mockReturnValue(creation({ isError: true, error: new Error('boom') }))

    render(<CreateNonPlayerEntityPage campaignId="c1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create the Non-Player Entity. Try again.")
  })

  it('maps a 400 on name and age to field errors instead of the alert', () => {
    const error = new NonPlayerEntityValidationError([
      { path: 'name', messages: ['Enter a name.'] },
      { path: 'age', messages: ['Enter an age from 0 to 150, in whole years.'] },
    ])
    mockUseCreate.mockReturnValue(creation({ isError: true, error }))

    render(<CreateNonPlayerEntityPage campaignId="c1" />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Enter a name.')).toBeInTheDocument()
  })

  it('shows a Player the not-found page (SP-UX-39)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

    render(<CreateNonPlayerEntityPage campaignId="c1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Non-Player Entity" })).toBeInTheDocument()
  })
})
