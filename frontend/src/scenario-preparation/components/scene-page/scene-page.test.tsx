import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SceneFinishedError, SceneNotRemovableError, SceneValidationError } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'
import type { RichTextDocument } from '@/shared/types/RichText'

import { ScenePage } from './scene-page'

// specs/scenario-preparation/ux.md section 14; SP-UX-20 to SP-UX-23, SP-UX-26, SP-UX-27, SP-A11Y-15, SP-A11Y-16.

const { mockUseCampaign, mockUseScene, mockUseEdit, mockUseRemove, editMutate, removeMutate, unlinkMutate, unlinkItemMutate, reset, removeReset, refetch } = vi.hoisted(
  () => ({
    mockUseCampaign: vi.fn(),
    mockUseScene: vi.fn(),
    mockUseEdit: vi.fn(),
    mockUseRemove: vi.fn(),
    editMutate: vi.fn(),
    removeMutate: vi.fn(),
    unlinkMutate: vi.fn(),
    unlinkItemMutate: vi.fn(),
    reset: vi.fn(),
    removeReset: vi.fn(),
    refetch: vi.fn(),
  }),
)

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntityLinks', () => ({
  useUnlinkNonPlayerEntity: () => ({ mutate: unlinkMutate, reset: vi.fn(), isPending: false, isError: false, error: null }),
}))
vi.mock('@/scenario-preparation/hooks/useItemLinks', () => ({
  useUnlinkItem: () => ({ mutate: unlinkItemMutate, reset: vi.fn(), isPending: false, isError: false, error: null }),
}))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useReorderHandouts: () => ({ mutate: vi.fn(), isPending: false }) }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({
  useScene: mockUseScene,
  useEditScene: mockUseEdit,
  useRemoveScene: mockUseRemove,
}))

const notes: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', version: 1, text: 'The key is under the stairs.', format: 1, style: '', detail: 0, mode: 'normal' }],
      },
    ],
  },
}

const prepared: Scene = {
  id: 'a1',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  keeperNotes: notes,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  itemLinks: [],
  handouts: [],
}
const active: Scene = { ...prepared, status: 'Active', startedAt: '2026-10-12T19:40:00Z' }
const finished: Scene = { ...active, status: 'Finished', finishedAt: '2026-10-12T21:05:00Z' }

const query = (data: Scene | null | undefined, overrides: Record<string, unknown> = {}) => ({
  data,
  isError: false,
  dataUpdatedAt: 1,
  refetch,
  ...overrides,
})
const editing = (overrides: Record<string, unknown> = {}) => ({
  mutate: editMutate,
  reset,
  isPending: false,
  isError: false,
  error: null,
  ...overrides,
})
const removing = (overrides: Record<string, unknown> = {}) => ({
  mutate: removeMutate,
  reset: removeReset,
  isPending: false,
  isError: false,
  error: null,
  ...overrides,
})

// The page's own status message comes first; the Handouts section has a live region of its own for moves.
const pageStatus = () => screen.getAllByRole('status')[0]

const renderPage = () => render(<ScenePage campaignId="c1" scenarioId="s1" sceneId="a1" />)

describe('ScenePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue(query(prepared))
    mockUseEdit.mockReturnValue(editing())
    mockUseRemove.mockReturnValue(removing())
  })

  describe('view', () => {
    it('shows the title, status, location, and rendered Keeper notes of a Prepared Scene with Edit and Remove Scene (SP-A11Y-10)', () => {
      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
      expect(screen.getByText('Prepared')).toBeInTheDocument()
      expect(screen.getByText('Location').nextElementSibling).toHaveTextContent('Arkham, Boston Road')
      expect(screen.getByRole('heading', { level: 2, name: 'Keeper notes' })).toBeInTheDocument()
      expect(screen.getByText('The key is under the stairs.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove Scene' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to the Scenario' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1')
    })

    it('omits the location when it is empty and says there are no Keeper notes when there are none or they are empty', () => {
      mockUseScene.mockReturnValue(query({ ...prepared, location: '', keeperNotes: null }))
      const { unmount } = renderPage()
      expect(screen.queryByText('Location')).not.toBeInTheDocument()
      expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
      unmount()

      mockUseScene.mockReturnValue(query({ ...prepared, keeperNotes: { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } } }))
      renderPage()
      expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
    })

    it('announces the status message passed by the previous page (SP-A11Y-16)', () => {
      routerState.location.state = { statusMessage: 'Scene created.' }

      renderPage()

      expect(pageStatus()).toHaveTextContent('Scene created.')
    })

    it('shows an Active Scene with its start time, Edit, and no Remove Scene (SP-UX-21, SP-UX-23)', () => {
      mockUseScene.mockReturnValue(query(active))

      renderPage()

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText(/Started/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Remove Scene' })).not.toBeInTheDocument()
    })

    it('shows a Finished Scene without Edit or Remove Scene and says it cannot be changed (SP-UX-22)', () => {
      mockUseScene.mockReturnValue(query(finished))

      renderPage()

      expect(screen.getByText('Finished', { selector: 'span.inline-flex' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Remove Scene' })).not.toBeInTheDocument()
      expect(screen.getByText("This Scene is finished and can't be changed.")).toBeInTheDocument()
    })
  })

  describe('not found, loading, and error', () => {
    it('shows the Scene not-found page to a Player and asks the API for nothing (SP-UX-26)', () => {
      mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
      mockUseScene.mockReturnValue(query(undefined))

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
      expect(mockUseScene).toHaveBeenCalledWith('c1', 's1', 'a1', false)
    })

    it('shows the Scene not-found page for an unknown Scene', () => {
      mockUseScene.mockReturnValue(query(null))

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    })

    it('shows busy placeholders while loading', () => {
      mockUseScene.mockReturnValue(query(undefined))

      const { container } = renderPage()

      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    })

    it('offers to try again when the Scene cannot load', async () => {
      mockUseScene.mockReturnValue(query(undefined, { isError: true }))

      renderPage()
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(screen.getByText("We couldn't load this Scene.")).toBeInTheDocument()
      expect(refetch).toHaveBeenCalled()
    })
  })

  describe('Non-Player Entity links', () => {
    const withLink: Scene = {
      ...prepared,
      nonPlayerEntityLinks: [
        { id: 'l1', nonPlayerEntity: { id: 'm1', type: 'MythosCreature', name: 'Ghoul' }, playerFacingName: 'A shape in the cellar', playerFacingDescription: null },
      ],
    }

    it('shows the Non-Player Entities section after the Keeper notes and before the actions (SP-UX-50)', () => {
      mockUseScene.mockReturnValue(query(withLink))

      renderPage()

      const keeperNotes = screen.getByRole('heading', { level: 2, name: 'Keeper notes' })
      const links = screen.getByRole('heading', { level: 2, name: 'Non-Player Entities' })
      const edit = screen.getByRole('button', { name: 'Edit' })
      expect(keeperNotes.compareDocumentPosition(links) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(links.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(screen.getByRole('heading', { level: 3, name: 'A shape in the cellar' })).toBeInTheDocument()
    })

    it('does not show the section while the Scene is being edited (SP-UX-20)', async () => {
      mockUseScene.mockReturnValue(query(withLink))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.queryByRole('heading', { level: 2, name: 'Non-Player Entities' })).not.toBeInTheDocument()
    })

    it('hides the link actions of a Finished Scene but keeps its links listed (SP-UX-57)', () => {
      mockUseScene.mockReturnValue(query({ ...withLink, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' }))

      renderPage()

      expect(screen.getByRole('heading', { level: 3, name: 'A shape in the cellar' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Link a Non-Player Entity' })).not.toBeInTheDocument()
    })

    it('announces "{name} unlinked." after an unlink (SP-UX-56)', async () => {
      unlinkMutate.mockImplementation((_variables: undefined, options: { onSuccess: () => void }) => options.onSuccess())
      mockUseScene.mockReturnValue(query(withLink))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Unlink A shape in the cellar' }))
      await userEvent.click(within_dialog('Unlink'))

      expect(pageStatus()).toHaveTextContent('A shape in the cellar unlinked.')
    })

    it('announces the navigation message from linking and moves focus to that link (SP-UX-52, SP-A11Y-33)', () => {
      routerState.location.state = { statusMessage: 'A shape in the cellar linked.', focusLinkId: 'l1' }
      mockUseScene.mockReturnValue(query(withLink))

      renderPage()

      expect(pageStatus()).toHaveTextContent('A shape in the cellar linked.')
      expect(screen.getByRole('heading', { level: 3, name: 'A shape in the cellar' })).toHaveFocus()
    })
  })

  describe('Items', () => {
    const withItems: Scene = {
      ...prepared,
      itemLinks: [
        { id: 'i1', item: { id: 'k1', name: "Walter Corbitt's diary" } },
        { id: 'i2', item: { id: 'k2', name: 'The cellar key' } },
      ],
    }

    it('shows the Items section after the Non-Player Entities and before the actions (SP-UX-97, SP-A11Y-51)', () => {
      mockUseScene.mockReturnValue(query(withItems))

      renderPage()

      const entities = screen.getByRole('heading', { level: 2, name: 'Non-Player Entities' })
      const items = screen.getByRole('heading', { level: 2, name: 'Items' })
      const edit = screen.getByRole('button', { name: 'Edit' })
      expect(entities.compareDocumentPosition(items) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(items.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(screen.getByRole('link', { name: "Walter Corbitt's diary" })).toHaveAttribute('href', '/campaigns/c1/items/k1')
    })

    it('says no Items are linked yet and offers Link an Item on a Scene without any (SP-UX-97)', () => {
      renderPage()

      expect(screen.getByText('No Items linked yet.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Link an Item' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1/item-links/new')
    })

    it('lists the Items of a Finished Scene without Link an Item or Unlink (SP-UX-97)', () => {
      mockUseScene.mockReturnValue(query({ ...withItems, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' }))

      renderPage()

      expect(screen.getByRole('link', { name: "Walter Corbitt's diary" })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Link an Item' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Unlink / })).not.toBeInTheDocument()
    })

    it('does not show the section while the Scene is being edited', async () => {
      mockUseScene.mockReturnValue(query(withItems))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.queryByRole('heading', { level: 2, name: 'Items' })).not.toBeInTheDocument()
    })

    it('announces "{name} unlinked." after an unlink (SP-UX-99)', async () => {
      unlinkItemMutate.mockImplementation((_variables: undefined, options: { onSuccess: () => void }) => options.onSuccess())
      mockUseScene.mockReturnValue(query(withItems))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Unlink The cellar key' }))
      await userEvent.click(within_dialog('Unlink'))

      expect(pageStatus()).toHaveTextContent('The cellar key unlinked.')
    })

    it('announces the navigation message from linking and moves focus to that Item (SP-UX-98, SP-A11Y-54)', () => {
      routerState.location.state = { statusMessage: 'The cellar key linked.', focusItemLinkId: 'i2' }
      mockUseScene.mockReturnValue(query(withItems))

      renderPage()

      expect(pageStatus()).toHaveTextContent('The cellar key linked.')
      expect(screen.getByRole('link', { name: 'The cellar key' })).toHaveFocus()
    })
  })

  describe('Handouts', () => {
    const withHandouts: Scene = {
      ...prepared,
      handouts: [
        { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' },
        { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" },
      ],
    }

    it('shows the Handouts section after the Keeper notes and before the Non-Player Entities (SP-UX-50, SP-UX-64)', () => {
      mockUseScene.mockReturnValue(query(withHandouts))

      renderPage()

      const keeperNotes = screen.getByRole('heading', { level: 2, name: 'Keeper notes' })
      const handouts = screen.getByRole('heading', { level: 2, name: 'Handouts' })
      const links = screen.getByRole('heading', { level: 2, name: 'Non-Player Entities' })
      expect(keeperNotes.compareDocumentPosition(handouts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(handouts.compareDocumentPosition(links) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(screen.getByRole('link', { name: 'The front door' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1/handouts/h1')
    })

    it('says there are no Handouts yet on a Scene without any (SP-UX-64)', () => {
      renderPage()

      expect(screen.getByText('No Handouts yet.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Add Handout' })).toBeInTheDocument()
    })

    it('does not show the section while the Scene is being edited (SP-UX-20)', async () => {
      mockUseScene.mockReturnValue(query(withHandouts))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.queryByRole('heading', { level: 2, name: 'Handouts' })).not.toBeInTheDocument()
    })

    it('lists the Handouts of a Finished Scene without Add Handout or move buttons (SP-UX-73)', () => {
      mockUseScene.mockReturnValue(query({ ...withHandouts, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' }))

      renderPage()

      expect(screen.getByRole('link', { name: 'The front door' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Add Handout' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument()
    })

    it('announces "{title} added." from the navigation state and moves focus to that Handout (SP-UX-65, SP-A11Y-40)', () => {
      routerState.location.state = { statusMessage: 'The front door added.', focusHandoutId: 'h1' }
      mockUseScene.mockReturnValue(query(withHandouts))

      renderPage()

      expect(pageStatus()).toHaveTextContent('The front door added.')
      expect(screen.getByRole('link', { name: 'The front door' })).toHaveFocus()
    })

    it('announces "{title} deleted." and moves focus to the Handouts heading (SP-UX-71, SP-A11Y-40)', () => {
      routerState.location.state = { statusMessage: 'The front door deleted.', focusHandoutsHeading: true }

      renderPage()

      expect(pageStatus()).toHaveTextContent('The front door deleted.')
      expect(screen.getByRole('heading', { level: 2, name: 'Handouts' })).toHaveFocus()
    })
  })

  describe('edit', () => {
    it('swaps the view for a prefilled form on Edit, keeps the saved title as the heading, and focuses Title (SP-UX-20, SP-A11Y-15)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByLabelText('Title')).toHaveValue('The Corbitt House')
      expect(screen.getByLabelText('Location (optional)')).toHaveValue('Arkham, Boston Road')
      expect(screen.getByLabelText('Title')).toHaveFocus()
      expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('saves, returns to the view with "Scene saved." and moves focus to Edit (SP-UX-20, SP-A11Y-15, SP-A11Y-16)', async () => {
      editMutate.mockImplementation((_values, options) => options.onSuccess())
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await userEvent.clear(screen.getByLabelText('Title'))
      await userEvent.type(screen.getByLabelText('Title'), 'The Corbitt Cellar')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(editMutate.mock.calls[0][0]).toMatchObject({ title: 'The Corbitt Cellar', location: 'Arkham, Boston Road' })
      expect(pageStatus()).toHaveTextContent('Scene saved.')
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
    })

    it('discards the edits on Cancel without confirmation and focuses Edit (SP-UX-20)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await userEvent.type(screen.getByLabelText('Title'), ' II')
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(editMutate).not.toHaveBeenCalled()
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
      expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    })

    it('shows a save failure as an alert and keeps the form', async () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new Error('boom') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Scene. Try again.")
      expect(screen.getByLabelText('Title')).toBeInTheDocument()
    })

    it('maps a refusal from the server to the field errors instead of the failure alert', async () => {
      mockUseEdit.mockReturnValue(
        editing({ isError: true, error: new SceneValidationError({ title: 'Enter a title.' }) }),
      )
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title.')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('explains a save refused because the Scene was finished meanwhile, and Cancel refetches the Finished view (SP-UX-22)', async () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new SceneFinishedError() }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel.",
      )

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(refetch).toHaveBeenCalled()
    })

    it('disables Save while the request is in flight (SP-UX-27)', async () => {
      mockUseEdit.mockReturnValue(editing({ isPending: true }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    })
  })

  describe('remove', () => {
    it('asks for confirmation naming the Scene, and Cancel keeps it and returns focus to Remove Scene (SP-UX-23, SP-A11Y-15)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Remove Scene' }))
      expect(screen.getByRole('alertdialog', { name: 'Remove The Corbitt House?' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(removeMutate).not.toHaveBeenCalled()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove Scene' })).toHaveFocus()
    })

    it('removes the Scene and returns to the Scenario page with "Scene removed."', async () => {
      removeMutate.mockImplementation((_value, options) => options.onSuccess())
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Remove Scene' }))
      await userEvent.click(within_dialog('Remove Scene'))

      expect(navigateSpy).toHaveBeenCalledWith({
        to: '/campaigns/$campaignId/scenarios/$scenarioId',
        params: { campaignId: 'c1', scenarioId: 's1' },
        state: { statusMessage: 'Scene removed.' },
      })
    })

    it('shows a removal failure in the dialog', async () => {
      mockUseRemove.mockReturnValue(removing({ isError: true, error: new Error('boom') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Remove Scene' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't remove the Scene. Try again.")
    })

    it('explains a removal refused because the Scene has been started, and closing the dialog refetches the Scene', async () => {
      mockUseRemove.mockReturnValue(removing({ isError: true, error: new SceneNotRemovableError() }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Remove Scene' }))
      expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been started, so it can't be removed.")

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(refetch).toHaveBeenCalled()
    })

    it('shows Removing... and disables the buttons while in flight (SP-UX-27)', async () => {
      mockUseRemove.mockReturnValue(removing({ isPending: true }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Remove Scene' }))

      expect(screen.getByRole('button', { name: 'Removing...' })).toBeDisabled()
      await act(async () => undefined)
    })
  })
})

// specs/scene-play/ux.md section 1; SPL-UX-1: the run link sits before Edit.
describe('ScenePage run links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseEdit.mockReturnValue(editing())
    mockUseRemove.mockReturnValue(removing())
  })

  it('offers "Start Scene" on a Prepared Scene, to the nested start page, before Edit', () => {
    mockUseScene.mockReturnValue(query(prepared))
    renderPage()

    const start = screen.getByRole('link', { name: 'Start Scene' })
    expect(start).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1/start')
    expect(start.compareDocumentPosition(screen.getByRole('button', { name: 'Edit' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Open Active Scene' })).not.toBeInTheDocument()
  })

  it('offers "Open Active Scene" on an Active Scene before Edit', () => {
    mockUseScene.mockReturnValue(query(active))
    renderPage()

    const open = screen.getByRole('link', { name: 'Open Active Scene' })
    expect(open).toHaveAttribute('href', '/campaigns/c1/active-scene')
    expect(open.compareDocumentPosition(screen.getByRole('button', { name: 'Edit' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Start Scene' })).not.toBeInTheDocument()
  })

  it('offers neither on a Finished Scene', () => {
    mockUseScene.mockReturnValue(query(finished))
    renderPage()

    expect(screen.queryByRole('link', { name: 'Start Scene' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open Active Scene' })).not.toBeInTheDocument()
  })
})

function within_dialog(name: string): HTMLElement {
  const dialog = screen.getByRole('alertdialog')
  const button = Array.from(dialog.querySelectorAll('button')).find((candidate) => candidate.textContent === name)
  if (!button) {
    throw new Error(`No button ${name} in the dialog`)
  }
  return button
}
