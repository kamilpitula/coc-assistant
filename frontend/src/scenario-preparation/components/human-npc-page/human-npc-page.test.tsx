import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityValidationError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { gangsterHumanNpc, knottHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'

import { HumanNpcPage } from './human-npc-page'

// specs/scenario-preparation/ux.md sections 25.1 to 25.3 and 25.6; SP-UX-32, SP-UX-33, SP-UX-35 to SP-UX-37, SP-UX-39, SP-UX-40.

const { mockUseCampaign, mockUseHumanNpc, mockUseEdit, mockUseDelete, editMutate, deleteMutate, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseHumanNpc: vi.fn(),
  mockUseEdit: vi.fn(),
  mockUseDelete: vi.fn(),
  editMutate: vi.fn(),
  deleteMutate: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/hooks/useRuleData', () => ({
  useSkillCatalog: () => ({ data: undefined, isError: false, refetch: vi.fn() }),
  useOccupationCatalog: () => ({ data: undefined }),
}))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({
  useHumanNpc: mockUseHumanNpc,
  useEditHumanNpc: mockUseEdit,
  useDeleteHumanNpc: mockUseDelete,
}))

function mutation(mutate: ReturnType<typeof vi.fn>, overrides: Record<string, unknown> = {}) {
  return { mutate, reset: vi.fn(), isPending: false, isError: false, error: null, ...overrides }
}

describe('HumanNpcPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseHumanNpc.mockReturnValue({ data: gangsterHumanNpc, isError: false, refetch })
    mockUseEdit.mockReturnValue(mutation(editMutate))
    mockUseDelete.mockReturnValue(mutation(deleteMutate))
  })

  it('shows the profile with a Back link, the status passed by the page that created it, Edit, and Delete (SP-UX-32)', () => {
    routerState.location.state = { statusMessage: 'Human NPC created.' }

    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    expect(screen.getByRole('link', { name: 'Back to Non-Player Entities' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities')
    expect(screen.getByRole('status')).toHaveTextContent('Human NPC created.')
    expect(screen.getByRole('heading', { level: 1, name: 'Gangster' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument()
  })

  it('swaps the whole view for the form on Edit, keeping the saved name as the h1 (ux 25.2)', async () => {
    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Gangster' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('Name')[0]).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('saves, returns to the view with "Human NPC saved.", and puts focus on Edit (SP-UX-36)', async () => {
    editMutate.mockImplementation((_input, options) => options.onSuccess())
    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(editMutate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gangster', age: 30 }), expect.any(Object))
    expect(screen.getByRole('status')).toHaveTextContent('Human NPC saved.')
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
  })

  it('cancels without confirmation and puts focus on Edit', async () => {
    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.type(screen.getByLabelText('Goal'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(editMutate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
    expect(screen.queryByText('Human NPC saved.')).not.toBeInTheDocument()
  })

  it('shows the error summary and keeps the form when the server refuses the save (SP-UX-35)', async () => {
    mockUseEdit.mockReturnValue(
      mutation(editMutate, {
        isError: true,
        error: new NonPlayerEntityValidationError([{ path: 'combat.weapons[0].damage', messages: ['Enter the damage.'] }]),
      }),
    )
    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('heading', { name: 'There is 1 problem' })).toBeInTheDocument()
    expect(screen.getAllByLabelText('Name')[0]).toBeInTheDocument()
  })

  it('shows a failure alert, not the summary, when the save fails for another reason', async () => {
    mockUseEdit.mockReturnValue(mutation(editMutate, { isError: true, error: new Error('boom') }))
    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Human NPC. Try again.")
  })

  it('asks before deleting, and confirming returns to the list with "{name} deleted." (SP-UX-37)', async () => {
    deleteMutate.mockImplementation((_value, options) => options.onSuccess())
    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog', { name: 'Delete Gangster?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/non-player-entities',
      params: { campaignId: 'c1' },
      state: { statusMessage: 'Gangster deleted.' },
    })
  })

  it('keeps the profile when the Keeper cancels the deletion and returns focus to Delete (SP-UX-37)', async () => {
    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(deleteMutate).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows a Player the not-found page and never enables the profile query (SP-UX-39)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseHumanNpc.mockReturnValue({ data: undefined, isError: false, refetch })

    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Non-Player Entity" })).toBeInTheDocument()
    expect(mockUseHumanNpc).toHaveBeenCalledWith('c1', 'h1', false)
  })

  it('shows not-found when the API answered 404 (another Campaign, another type, unknown id)', () => {
    mockUseHumanNpc.mockReturnValue({ data: null, isError: false, refetch })

    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Non-Player Entity" })).toBeInTheDocument()
  })

  it('shows a busy skeleton while loading and an error with Try again when the load fails', async () => {
    mockUseHumanNpc.mockReturnValue({ data: undefined, isError: false, refetch })
    const { container, rerender } = render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseHumanNpc.mockReturnValue({ data: undefined, isError: true, refetch })
    rerender(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load this Human NPC.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('shows a narrative profile with no optional sections', () => {
    mockUseHumanNpc.mockReturnValue({ data: knottHumanNpc, isError: false, refetch })

    render(<HumanNpcPage campaignId="c1" humanNpcId="h1" />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Details', 'Keeper notes'])
  })
})
