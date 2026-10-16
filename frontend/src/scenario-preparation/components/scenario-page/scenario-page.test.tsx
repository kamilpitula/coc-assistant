import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ScenarioValidationError } from '@/scenario-preparation/services/scenarioApi'
import { routerState } from '@/shared/test-support/routerMock'

import { ScenarioPage } from './scenario-page'

// specs/scenario-preparation/ux.md section 5; SP-UX-3, SP-UX-6, SP-UX-7, SP-UX-9, SP-UX-10, SP-A11Y-4, SP-A11Y-5.

const { mockUseCampaign, mockUseScenario, mockUseEdit, mutate, reset, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseScenario: vi.fn(),
  mockUseEdit: vi.fn(),
  mutate: vi.fn(),
  reset: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useScenarios', () => ({ useScenario: mockUseScenario, useEditScenario: mockUseEdit }))

const scenario = { id: 's1', title: 'The Haunting', keeperNotes: 'Cellar key.\nCorbitt after midnight.' }

function scenarioQuery(overrides: Record<string, unknown> = {}) {
  return { data: scenario, isPending: false, isError: false, refetch, ...overrides }
}

function editing(overrides: Record<string, unknown> = {}) {
  return { mutate, reset, isPending: false, isError: false, error: null, ...overrides }
}

describe('ScenarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScenario.mockReturnValue(scenarioQuery())
    mockUseEdit.mockReturnValue(editing())
  })

  it('shows the title, the Keeper notes with their line breaks, and Edit', () => {
    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'The Haunting' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.getByText(/Cellar key\./)).toHaveClass('whitespace-pre-line')
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('says there are no Keeper notes yet when they are empty', () => {
    mockUseScenario.mockReturnValue(scenarioQuery({ data: { ...scenario, keeperNotes: '' } }))

    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
  })

  it('announces the status message passed by the previous page (SP-UX-3, SP-A11Y-4)', () => {
    routerState.location.state = { statusMessage: 'Scenario created.' }

    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Scenario created.')
  })

  it('swaps the view for a prefilled form on Edit, keeps the saved title as the heading, and focuses Title (SP-A11Y-5)', async () => {
    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.type(screen.getByLabelText('Title'), ' II')

    expect(screen.getByLabelText('Title')).toHaveValue('The Haunting II')
    expect(screen.getByRole('heading', { level: 1, name: 'The Haunting' })).toBeInTheDocument()
    expect(screen.getByLabelText('Keeper notes (optional)')).toHaveValue('Cellar key.\nCorbitt after midnight.')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('focuses Title when Edit opens', async () => {
    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('saves, returns to the view with "Scenario saved.", and focuses Edit (SP-UX-6, SP-A11Y-5)', async () => {
    mutate.mockImplementation((_values, options) => options.onSuccess({ ...scenario, title: 'The Haunting II' }))
    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.type(screen.getByLabelText('Title'), ' II')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mutate).toHaveBeenCalledWith(
      { title: 'The Haunting II', keeperNotes: 'Cellar key.\nCorbitt after midnight.' },
      expect.any(Object),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Scenario saved.')
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
  })

  it('discards the edits on Cancel without asking and focuses Edit (SP-UX-6)', async () => {
    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.type(screen.getByLabelText('Title'), ' II')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Title')).toHaveValue('The Haunting')
  })

  it('disables Save and reads "Saving..." while the request is in flight (SP-UX-7)', async () => {
    const { rerender } = render(<ScenarioPage campaignId="c1" scenarioId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    mockUseEdit.mockReturnValue(editing({ isPending: true }))
    rerender(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })

  it('keeps the form and announces a save failure', async () => {
    const { rerender } = render(<ScenarioPage campaignId="c1" scenarioId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    mockUseEdit.mockReturnValue(editing({ isError: true, error: new Error('boom') }))
    rerender(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Scenario. Try again.")
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('maps a server 400 to the field error', async () => {
    const { rerender } = render(<ScenarioPage campaignId="c1" scenarioId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    mockUseEdit.mockReturnValue(editing({ isError: true, error: new ScenarioValidationError({ title: 'Enter a title.' }) }))
    rerender(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title.')
  })

  it('shows a busy skeleton while loading', () => {
    mockUseScenario.mockReturnValue(scenarioQuery({ data: undefined, isPending: true }))

    const { container } = render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers to try again when the Scenario cannot load', async () => {
    mockUseScenario.mockReturnValue(scenarioQuery({ data: undefined, isError: true }))

    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load this Scenario.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('shows not found for an unknown or other-Campaign Scenario (SP-UX-10)', () => {
    mockUseScenario.mockReturnValue(scenarioQuery({ data: null }))

    render(<ScenarioPage campaignId="c1" scenarioId="s9" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeInTheDocument()
  })

  it('shows not found to a Player and never asks for the Scenario (SP-UX-9)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseScenario.mockReturnValue(scenarioQuery({ data: undefined, isPending: false, fetchStatus: 'idle' }))

    render(<ScenarioPage campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scenario" })).toBeInTheDocument()
    expect(mockUseScenario).toHaveBeenCalledWith('c1', 's1', false)
  })
})
