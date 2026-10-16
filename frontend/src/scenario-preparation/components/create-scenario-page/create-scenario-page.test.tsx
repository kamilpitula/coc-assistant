import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ScenarioValidationError } from '@/scenario-preparation/services/scenarioApi'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { CreateScenarioPage } from './create-scenario-page'

// specs/scenario-preparation/ux.md section 4; SP-UX-3, SP-UX-5, SP-UX-7, SP-UX-9.

const { mockUseCampaign, mockUseCreate, mutate } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseCreate: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useScenarios', () => ({ useCreateScenario: mockUseCreate }))

const keeperCampaign = { id: 'c1', name: 'The Haunting', role: 'Keeper' }
const playerCampaign = { id: 'c1', name: 'The Haunting', role: 'Player' }

function creation(overrides: Record<string, unknown> = {}) {
  return { mutate, isPending: false, isError: false, error: null, ...overrides }
}

describe('CreateScenarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: keeperCampaign })
    mockUseCreate.mockReturnValue(creation())
  })

  it('shows the Create Scenario heading, the form, and a Cancel link back to the Overview', () => {
    render(<CreateScenarioPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Create Scenario' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1')
  })

  it('creates the Scenario and opens its page with "Scenario created." (SP-UX-3)', async () => {
    mutate.mockImplementation((_values, options) => options.onSuccess({ id: 's1', title: 'The Haunting', keeperNotes: '' }))
    render(<CreateScenarioPage campaignId="c1" />)

    await userEvent.type(screen.getByLabelText('Title'), 'The Haunting')
    await userEvent.click(screen.getByRole('button', { name: 'Create Scenario' }))

    expect(mutate).toHaveBeenCalledWith({ title: 'The Haunting', keeperNotes: '' }, expect.any(Object))
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/scenarios/$scenarioId',
      params: { campaignId: 'c1', scenarioId: 's1' },
      state: { statusMessage: 'Scenario created.' },
    })
  })

  it('does not call the API for an empty title (SP-UX-5)', async () => {
    render(<CreateScenarioPage campaignId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Create Scenario' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a title.')).toBeInTheDocument()
  })

  it('disables the button and reads "Creating..." while the request is in flight (SP-UX-7)', () => {
    mockUseCreate.mockReturnValue(creation({ isPending: true }))

    render(<CreateScenarioPage campaignId="c1" />)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('announces a failure and keeps the input', () => {
    mockUseCreate.mockReturnValue(creation({ isError: true, error: new Error('boom') }))

    render(<CreateScenarioPage campaignId="c1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create the Scenario. Try again.")
  })

  it('maps a server 400 to field errors instead of the general failure', () => {
    mockUseCreate.mockReturnValue(
      creation({ isError: true, error: new ScenarioValidationError({ title: 'Enter a title.' }) }),
    )

    render(<CreateScenarioPage campaignId="c1" />)

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows not found to a Player without any request (SP-UX-9)', () => {
    mockUseCampaign.mockReturnValue({ data: playerCampaign })

    render(<CreateScenarioPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })
})
