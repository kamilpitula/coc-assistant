import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityInUseError, NonPlayerEntityNotFoundError, NonPlayerEntityValidationError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { ghoulMythosCreature, narrativeGhoul } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'

import { MythosCreaturePage } from './mythos-creature-page'

// specs/scenario-preparation/ux.md sections 25.1 to 25.3 and 25.6; SP-UX-32, SP-UX-33, SP-UX-35 to SP-UX-41, SP-A11Y-22.

const { mockUseCampaign, mockUseMythosCreature, mockUseEdit, mockUseDelete, mockUseDuplicate, editMutate, deleteMutate, duplicateMutate, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseMythosCreature: vi.fn(),
  mockUseEdit: vi.fn(),
  mockUseDelete: vi.fn(),
  mockUseDuplicate: vi.fn(),
  editMutate: vi.fn(),
  deleteMutate: vi.fn(),
  duplicateMutate: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/hooks/useRuleData', () => ({
  useSkillCatalog: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
}))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({
  useMythosCreature: mockUseMythosCreature,
  useEditMythosCreature: mockUseEdit,
  useDeleteMythosCreature: mockUseDelete,
  useDuplicateMythosCreature: mockUseDuplicate,
}))

function mutation(mutate: ReturnType<typeof vi.fn>, overrides: Record<string, unknown> = {}) {
  return { mutate, reset: vi.fn(), isPending: false, isError: false, error: null, ...overrides }
}

describe('MythosCreaturePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseMythosCreature.mockReturnValue({ data: ghoulMythosCreature, isError: false, refetch })
    mockUseEdit.mockReturnValue(mutation(editMutate))
    mockUseDelete.mockReturnValue(mutation(deleteMutate))
    mockUseDuplicate.mockReturnValue(mutation(duplicateMutate))
  })

  it('shows the profile with a Back link, the status passed by the page that created it, Edit, Duplicate, and Delete (SP-UX-32)', () => {
    routerState.location.state = { statusMessage: 'Mythos Creature created.' }

    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    expect(screen.getByRole('link', { name: 'Back to Non-Player Entities' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities')
    expect(screen.getByRole('status')).toHaveTextContent('Mythos Creature created.')
    expect(screen.getByRole('heading', { level: 1, name: 'Ghoul' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeInTheDocument()
  })

  it('swaps the whole view for the form on Edit, keeping the saved name as the h1 and the section index (ux 25.2, SP-UX-45)', async () => {
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Ghoul' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('Name')[0]).toHaveFocus()
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('saves, returns to the view with "Mythos Creature saved.", and puts focus on Edit (SP-UX-36)', async () => {
    editMutate.mockImplementation((_input, options) => options.onSuccess())
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(editMutate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ghoul' }), expect.any(Object))
    expect(screen.getByRole('status')).toHaveTextContent('Mythos Creature saved.')
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
  })

  it('cancels without confirmation and puts focus on Edit', async () => {
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.type(screen.getByLabelText('Origin'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(editMutate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
    expect(screen.queryByText('Mythos Creature saved.')).not.toBeInTheDocument()
  })

  it('shows the error summary and keeps the form when the server refuses the save (SP-UX-35)', async () => {
    mockUseEdit.mockReturnValue(
      mutation(editMutate, {
        isError: true,
        error: new NonPlayerEntityValidationError([{ path: 'sanityloss.value', messages: ['Write the Sanity loss as success/failure, for example 0/1D6.'] }]),
      }),
    )
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('heading', { name: 'There is 1 problem' })).toBeInTheDocument()
    expect(screen.getByLabelText('Sanity loss')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a failure alert, not the summary, when the save fails for another reason', async () => {
    mockUseEdit.mockReturnValue(mutation(editMutate, { isError: true, error: new Error('boom') }))
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Mythos Creature. Try again.")
  })

  it('shows a narrative profile with no optional sections', () => {
    mockUseMythosCreature.mockReturnValue({ data: narrativeGhoul, isError: false, refetch })

    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Details', 'Keeper notes'])
  })

  it('asks before deleting, and confirming returns to the list with "{name} deleted." (SP-UX-37)', async () => {
    deleteMutate.mockImplementation((_value, options) => options.onSuccess())
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog', { name: 'Delete Ghoul?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/non-player-entities',
      params: { campaignId: 'c1' },
      state: { statusMessage: 'Ghoul deleted.' },
    })
  })

  it('explains that a profile part of a played Scene cannot be deleted and disables Delete (SP-UX-58)', async () => {
    mockUseDelete.mockReturnValue(mutation(deleteMutate, { isError: true, error: new NonPlayerEntityInUseError() }))
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Delete Ghoul?' })
    expect(dialog).toHaveTextContent("Ghoul is part of a Scene that has been played, so it can't be deleted.")
    expect(dialog).not.toHaveTextContent("We couldn't delete")
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('keeps the profile when the Keeper cancels the deletion and returns focus to Delete (SP-UX-37)', async () => {
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(deleteMutate).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
  })

  it('shows a Player the not-found page and never enables the profile query (SP-UX-39)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseMythosCreature.mockReturnValue({ data: undefined, isError: false, refetch })

    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Non-Player Entity" })).toBeInTheDocument()
    expect(mockUseMythosCreature).toHaveBeenCalledWith('c1', 'm1', false)
  })

  it('shows not-found when the API answered 404 (another Campaign, another type, unknown id)', () => {
    mockUseMythosCreature.mockReturnValue({ data: null, isError: false, refetch })

    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Non-Player Entity" })).toBeInTheDocument()
  })

  it('shows a busy skeleton while loading and an error with Try again when the load fails', async () => {
    mockUseMythosCreature.mockReturnValue({ data: undefined, isError: false, refetch })
    const { container, rerender } = render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseMythosCreature.mockReturnValue({ data: undefined, isError: true, refetch })
    rerender(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load this Mythos Creature.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('shows Duplicate between Edit and Delete in the view and not in edit mode (SP-UX-38)', async () => {
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    const labels = screen.getAllByRole('button').map((button) => button.textContent)
    expect(labels.indexOf('Edit')).toBeGreaterThanOrEqual(0)
    expect(labels.indexOf('Edit')).toBeLessThan(labels.indexOf('Duplicate'))
    expect(labels.indexOf('Duplicate')).toBeLessThan(labels.indexOf('Delete'))

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument()
  })

  it('duplicates at once without a dialog and opens the copy with its status, asking for focus on its heading (SP-UX-38, H1)', async () => {
    duplicateMutate.mockImplementation((_value, options) => options.onSuccess({ ...ghoulMythosCreature, id: 'm2', name: 'Ghoul (copy)' }))
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/mythos-creatures/$mythosCreatureId',
      params: { campaignId: 'c1', mythosCreatureId: 'm2' },
      state: { statusMessage: "Copy created. It isn't part of any Scene.", focusHeading: true },
    })
  })

  it('reads "Duplicating..." and is disabled while the copy is being made, so a second activation sends nothing (SP-UX-40)', async () => {
    mockUseDuplicate.mockReturnValue(mutation(duplicateMutate, { isPending: true }))
    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    const button = screen.getByRole('button', { name: 'Duplicating...' })
    await userEvent.click(button)

    expect(button).toBeDisabled()
    expect(duplicateMutate).not.toHaveBeenCalled()
  })

  it('shows the copy with its own status and never "Mythos Creature saved." after the source was just saved (SP-UX-38)', async () => {
    editMutate.mockImplementation((_input, options) => options.onSuccess())
    const { rerender } = render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('status')).toHaveTextContent('Mythos Creature saved.')

    routerState.location.state = { statusMessage: "Copy created. It isn't part of any Scene.", focusHeading: true }
    mockUseMythosCreature.mockReturnValue({ data: { ...ghoulMythosCreature, id: 'm2', name: 'Ghoul (copy)' }, isError: false, refetch })
    rerender(<MythosCreaturePage campaignId="c1" mythosCreatureId="m2" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Ghoul (copy)' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent("Copy created. It isn't part of any Scene.")
    expect(screen.queryByText('Mythos Creature saved.')).not.toBeInTheDocument()
  })

  it('puts focus on the copy heading when it was opened by Duplicate (SP-A11Y-22)', () => {
    routerState.location.state = { statusMessage: "Copy created. It isn't part of any Scene.", focusHeading: true }

    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m2" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Ghoul' })).toHaveFocus()
  })

  it.each([
    ['500', new Error('boom')],
    ['404', new NonPlayerEntityNotFoundError()],
  ])('shows an alert under the actions, enables Duplicate again, and keeps focus on it when a %s answer fails it (SP-UX-41, SP-A11Y-22)', (_label, error) => {
    mockUseDuplicate.mockReturnValue(mutation(duplicateMutate, { isError: true, error }))

    render(<MythosCreaturePage campaignId="c1" mythosCreatureId="m1" />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't duplicate Ghoul. Try again.")
    expect(screen.getByRole('button', { name: 'Duplicate' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Duplicate' })).toHaveFocus()
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
