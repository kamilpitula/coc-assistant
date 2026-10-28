import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { keeperRosterAllApproved } from '@/campaign-play/test-support/rosterFixtures'
import { InvestigatorsRefusedError, NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

import { InvestigatorsPresentSection } from './investigators-present-section'

// specs/scene-play/ux.md section 3 (Investigators present); SPL-UX-10, SPL-UX-18, SPL-A11Y-3.
const { mockUseMembers, mockUseChange, changeMutate, changeReset } = vi.hoisted(() => ({
  mockUseMembers: vi.fn(),
  mockUseChange: vi.fn(),
  changeMutate: vi.fn(),
  changeReset: vi.fn(),
}))

vi.mock('@/campaign-play/hooks/useCampaignMembers', () => ({ useCampaignMembers: mockUseMembers }))
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useChangeInvestigatorsPresent: mockUseChange }))

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's',
  scenarioId: 'p',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [{ id: 'i-a', name: 'Dr. Ames' }, { id: 'unknown', name: null }],
  reveals: [],
}

const changing = (overrides: Record<string, unknown> = {}) => ({ mutate: changeMutate, reset: changeReset, isPending: false, error: null, ...overrides })

describe('InvestigatorsPresentSection', () => {
  const onSaved = vi.fn()
  const onFinishedMeanwhile = vi.fn()
  const renderSection = () =>
    render(<InvestigatorsPresentSection campaignId="c1" scene={scene} onSaved={onSaved} onFinishedMeanwhile={onFinishedMeanwhile} />)

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMembers.mockReturnValue({ data: keeperRosterAllApproved })
    mockUseChange.mockReturnValue(changing())
  })

  it('lists who is present under a labelled section with a Change button', () => {
    renderSection()

    expect(screen.getByRole('region', { name: 'Investigators present' })).toBeInTheDocument()
    expect(screen.getByText('Dr. Ames')).toBeInTheDocument()
    expect(screen.getByText('Unnamed Investigator')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })

  it('opens the fieldset with the present ones checked and focus on the first checkbox', async () => {
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Change' }))

    expect(screen.getByRole('checkbox', { name: /Dr. Ames/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Mae Doyle/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Dr. Ames/ })).toHaveFocus()
    expect(changeReset).toHaveBeenCalled()
  })

  it('saves the new selection in roster order, then returns focus to Change', async () => {
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Mae Doyle/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(changeMutate).toHaveBeenCalledWith(['i-a', 'i-c'], expect.any(Object))
    changeMutate.mock.calls[0][1].onSuccess()
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: 'Change' })).toHaveFocus()
  })

  it('refuses an empty selection with the message and focus on the first checkbox (SPL-UX-10)', async () => {
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Dr. Ames/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('group', { name: 'Investigators present' })).toHaveAccessibleDescription(/Choose at least one Investigator present\./)
    expect(screen.getByRole('checkbox', { name: /Dr. Ames/ })).toHaveFocus()
    expect(changeMutate).not.toHaveBeenCalled()
  })

  it('cancels without saving and returns focus to Change', async () => {
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(changeMutate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Change' })).toHaveFocus()
  })

  it.each([
    [new InvestigatorsRefusedError(), "One of these Investigators can't be present. Check the list and try again."],
    [new NoActiveSceneError(), "This Scene has been finished, so who is present can't be changed."],
    [new Error('boom'), "We couldn't save who is present. Try again."],
  ])('shows the refusal as an alert', async (error, message) => {
    mockUseChange.mockReturnValue(changing({ error }))
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Change' }))

    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })

  it('asks the page to refetch when the Keeper cancels after finding the Scene finished', async () => {
    mockUseChange.mockReturnValue(changing({ error: new NoActiveSceneError() }))
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Change' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onFinishedMeanwhile).toHaveBeenCalledTimes(1)
  })

  it('disables Save and reads "Saving..." while the save is in flight (SPL-UX-18)', async () => {
    mockUseChange.mockReturnValue(changing({ isPending: true }))
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Change' }))

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })
})
