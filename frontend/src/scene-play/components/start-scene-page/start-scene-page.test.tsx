import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { keeperRosterAllApproved, keeperRosterWithoutPlayers } from '@/campaign-play/test-support/rosterFixtures'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { AnotherSceneActiveError, InvestigatorsRefusedError, SceneNotPreparedError } from '@/scene-play/services/activeSceneApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'

import { StartScenePage } from './start-scene-page'

// specs/scene-play/ux.md section 2; SPL-UX-2, 4, 5, 6, 7, 8, 17, 18; SPL-A11Y-2, SPL-A11Y-3.
const { mockUseCampaign, mockUseScene, mockUseScenario, mockUseMembers, mockUseActive, mockUseStart, startMutate, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseScenario: vi.fn(),
  mockUseMembers: vi.fn(),
  mockUseActive: vi.fn(),
  mockUseStart: vi.fn(),
  startMutate: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/hooks/useCampaignMembers', () => ({ useCampaignMembers: mockUseMembers }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useScenarios', () => ({ useScenario: mockUseScenario }))
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive, useStartScene: mockUseStart }))

const prepared: Scene = {
  id: 'a1',
  title: 'The Corbitt House',
  location: '',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  itemLinks: [],
  handouts: [],
}
const activeOther: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'other',
  scenarioId: 's1',
  scenarioTitle: 'The Haunting',
  title: 'Meeting Knott',
  location: '',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-c', name: 'Mae Doyle' }],
  reveals: [],
}

const query = (data: unknown, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch, ...overrides })
const starting = (overrides: Record<string, unknown> = {}) => ({ mutate: startMutate, isPending: false, error: null, ...overrides })

const renderPage = () => render(<StartScenePage campaignId="c1" scenarioId="s1" sceneId="a1" />)

describe('StartScenePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue(query(prepared))
    mockUseScenario.mockReturnValue(query({ id: 's1', title: 'The Haunting' }))
    mockUseMembers.mockReturnValue(query(keeperRosterAllApproved))
    mockUseActive.mockReturnValue(query(null))
    mockUseStart.mockReturnValue(starting())
  })

  it('lists every Approved Investigator, all checked when no Scene is Active, under the title and Scenario', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Start The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('Scenario: The Haunting')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Dr. Ames/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Mae Doyle/ })).toBeChecked()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })

  it('starts the Scene with the checked Investigators in roster order and opens the Active Scene page with the message', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('checkbox', { name: /Dr. Ames/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Start Scene' }))

    expect(startMutate).toHaveBeenCalledWith({ presentInvestigatorIds: ['i-c'], finishActiveScene: false }, expect.any(Object))
    startMutate.mock.calls[0][1].onSuccess()
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/active-scene',
      params: { campaignId: 'c1' },
      state: { statusMessage: 'The Corbitt House started.' },
    })
  })

  it('refuses an empty selection with the message, focuses the first checkbox, and starts nothing (SPL-UX-4)', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('checkbox', { name: /Dr. Ames/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Mae Doyle/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Start Scene' }))

    expect(screen.getByRole('group', { name: 'Investigators present' })).toHaveAccessibleDescription(/Choose at least one Investigator present\./)
    expect(screen.getByRole('checkbox', { name: /Dr. Ames/ })).toHaveFocus()
    expect(startMutate).not.toHaveBeenCalled()
  })

  describe('while another Scene is Active (SPL-UX-5, SPL-UX-6)', () => {
    beforeEach(() => mockUseActive.mockReturnValue(query(activeOther)))

    it('shows the notice before the fieldset, an unchecked "Finish {title} first", and pre-checks who is present there', () => {
      renderPage()

      expect(screen.getByRole('heading', { level: 2, name: 'Meeting Knott is the Active Scene' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Finish Meeting Knott first' })).not.toBeChecked()
      expect(screen.getByRole('checkbox', { name: /Mae Doyle/ })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: /Dr. Ames/ })).not.toBeChecked()
    })

    it('refuses to submit until the choice is made, focusing the finish checkbox', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Start Scene' }))

      expect(screen.getByRole('checkbox', { name: 'Finish Meeting Knott first' })).toHaveAccessibleDescription('Choose to finish Meeting Knott first, or cancel.')
      expect(screen.getByRole('checkbox', { name: 'Finish Meeting Knott first' })).toHaveFocus()
      expect(startMutate).not.toHaveBeenCalled()
    })

    it('starts with finishActiveScene true once the box is checked', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('checkbox', { name: 'Finish Meeting Knott first' }))
      await userEvent.click(screen.getByRole('button', { name: 'Start Scene' }))

      expect(startMutate).toHaveBeenCalledWith({ presentInvestigatorIds: ['i-c'], finishActiveScene: true }, expect.any(Object))
    })
  })

  describe('server refusals keep the input and show an alert', () => {
    it('409 not Prepared offers the way back to the Scene and refetches it', async () => {
      mockUseStart.mockReturnValue(starting({ error: new SceneNotPreparedError() }))
      renderPage()

      expect(screen.getByRole('alert')).toHaveTextContent("This Scene has already been started, so it can't be started again.")
      expect(screen.getByRole('alert')).toContainElement(screen.getAllByRole('link', { name: 'Back to the Scene' })[1])
      await userEvent.click(screen.getByRole('button', { name: 'Start Scene' }))
      startMutate.mock.calls[0][1].onError(new SceneNotPreparedError())
      expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('409 another Scene became Active refetches the Active Scene', async () => {
      mockUseStart.mockReturnValue(starting({ error: new AnotherSceneActiveError() }))
      renderPage()

      expect(screen.getByRole('alert')).toHaveTextContent('Another Scene was started meanwhile. Choose whether to finish it first.')
      await userEvent.click(screen.getByRole('button', { name: 'Start Scene' }))
      startMutate.mock.calls[0][1].onError(new AnotherSceneActiveError())
      expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('400 refetches the roster and tells the Keeper to check the list', async () => {
      mockUseStart.mockReturnValue(starting({ error: new InvestigatorsRefusedError() }))
      renderPage()

      expect(screen.getByRole('alert')).toHaveTextContent("One of these Investigators can't be present. Check the list and try again.")
      await userEvent.click(screen.getByRole('button', { name: 'Start Scene' }))
      startMutate.mock.calls[0][1].onError(new InvestigatorsRefusedError())
      expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('any other failure says so', () => {
      mockUseStart.mockReturnValue(starting({ error: new Error('boom') }))
      renderPage()

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't start the Scene. Try again.")
    })
  })

  it('disables the button and reads "Starting..." while the start is in flight (SPL-UX-18)', () => {
    mockUseStart.mockReturnValue(starting({ isPending: true }))
    renderPage()

    expect(screen.getByRole('button', { name: 'Starting...' })).toBeDisabled()
  })

  it('shows no form and the way back when no Investigator is Approved (SPL-UX-8)', () => {
    mockUseMembers.mockReturnValue(query(keeperRosterWithoutPlayers))
    renderPage()

    expect(screen.getByText('No Investigator is Approved yet. Approve an Investigator before starting a Scene.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
    expect(screen.queryByRole('button', { name: 'Start Scene' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('offers "Open Active Scene" for a Scene that is already Active and "Back to the Scene" for a Finished one', () => {
    mockUseScene.mockReturnValue(query({ ...prepared, status: 'Active' }))
    const { unmount } = renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House has already been started' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Active Scene' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
    unmount()

    mockUseScene.mockReturnValue(query({ ...prepared, status: 'Finished' }))
    renderPage()
    expect(screen.getByRole('link', { name: 'Back to the Scene' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start Scene' })).not.toBeInTheDocument()
  })

  it('shows the not-found page to a Player, who makes no request (SPL-UX-17)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    renderPage()

    expect(screen.getByRole('heading', { name: "We couldn't find that Scene" })).toBeInTheDocument()
    expect(mockUseScene).not.toHaveBeenCalled()
    expect(mockUseActive).not.toHaveBeenCalled()
  })

  it('shows the not-found page for an unknown Scene', () => {
    mockUseScene.mockReturnValue(query(null))
    renderPage()

    expect(screen.getByRole('heading', { name: "We couldn't find that Scene" })).toBeInTheDocument()
  })

  it('shows a busy skeleton while loading and a retry when loading fails', async () => {
    mockUseScene.mockReturnValue(query(undefined))
    const { container, unmount } = renderPage()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    unmount()

    mockUseScene.mockReturnValue(query(prepared, { isError: true }))
    renderPage()
    expect(screen.getByText("We couldn't load this Scene.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
