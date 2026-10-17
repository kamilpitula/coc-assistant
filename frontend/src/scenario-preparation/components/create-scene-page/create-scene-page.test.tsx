import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SceneValidationError } from '@/scenario-preparation/services/sceneApi'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { CreateScenePage } from './create-scene-page'

// specs/scenario-preparation/ux.md section 13; SP-UX-16, SP-UX-17, SP-UX-26, SP-UX-27.

const { mockUseCampaign, mockUseScenario, mockUseCreate, mutate } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseScenario: vi.fn(),
  mockUseCreate: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useScenarios', () => ({ useScenario: mockUseScenario }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useCreateScene: mockUseCreate }))

const scenario = { id: 's1', title: 'The Haunting', keeperNotes: '' }

function creation(overrides: Record<string, unknown> = {}) {
  return { mutate, isPending: false, isError: false, error: null, ...overrides }
}

describe('CreateScenePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScenario.mockReturnValue({ data: scenario })
    mockUseCreate.mockReturnValue(creation())
  })

  it('shows the Create Scene heading, the Scenario it belongs to, the form, and a Cancel link back to the Scenario', () => {
    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Create Scene' })).toBeInTheDocument()
    expect(screen.getByText('Scenario: The Haunting')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1')
  })

  it('creates the Scene and opens its page with "Scene created." (SP-UX-16)', async () => {
    mutate.mockImplementation((_values, options) => options.onSuccess({ id: 'a1' }))
    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    await userEvent.type(screen.getByLabelText('Title'), 'The Corbitt House')
    await userEvent.type(screen.getByLabelText('Location (optional)'), 'Arkham, Boston Road')
    await userEvent.click(screen.getByRole('button', { name: 'Create Scene' }))

    expect(mutate).toHaveBeenCalledWith({ title: 'The Corbitt House', location: 'Arkham, Boston Road', keeperNotes: null }, expect.any(Object))
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
      params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
      state: { statusMessage: 'Scene created.' },
    })
  })

  it('does not call the API for an empty title and focuses Title (SP-UX-17)', async () => {
    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Create Scene' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a title.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('disables the button and reads "Creating..." while the request is in flight (SP-UX-27)', () => {
    mockUseCreate.mockReturnValue(creation({ isPending: true }))

    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('announces a failure and keeps the input', () => {
    mockUseCreate.mockReturnValue(creation({ isError: true, error: new Error('boom') }))

    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create the Scene. Try again.")
  })

  it('maps a 400 from the server to the field errors', () => {
    mockUseCreate.mockReturnValue(
      creation({ isError: true, error: new SceneValidationError({ location: 'Location must be 200 characters or fewer.' }) }),
    )

    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByLabelText('Location (optional)')).toHaveAccessibleDescription(/Location must be 200 characters or fewer\./)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the Scenario not-found page to a Player and asks the API for nothing (SP-UX-26)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeInTheDocument()
    expect(mockUseScenario).toHaveBeenCalledWith('c1', 's1', false)
  })

  it('shows the Scenario not-found page for an unknown Scenario', () => {
    mockUseScenario.mockReturnValue({ data: null })

    render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeInTheDocument()
  })

  it('shows busy placeholders while the Scenario loads', () => {
    mockUseScenario.mockReturnValue({ data: undefined })

    const { container } = render(<CreateScenePage campaignId="c1" scenarioId="s1" />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
