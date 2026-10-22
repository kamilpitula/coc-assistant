import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  HandoutNotDeletableError,
  HandoutNotFoundError,
  HandoutValidationError,
} from '@/scenario-preparation/services/handoutApi'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { Handout } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { navigateSpy } from '@/shared/test-support/routerMock'
import type { RichTextDocument } from '@/shared/types/RichText'

import { HandoutPage } from './handout-page'

// specs/scenario-preparation/ux.md sections 42 and 44; SP-UX-68 to SP-UX-76, SP-A11Y-37, SP-A11Y-38, SP-A11Y-40, SP-A11Y-41.

const { mockUseCampaign, mockUseScene, mockUseHandout, mockUseEdit, mockUseDelete, editMutate, deleteMutate, editReset, deleteReset, refetchScene, refetchHandout } =
  vi.hoisted(() => ({
    mockUseCampaign: vi.fn(),
    mockUseScene: vi.fn(),
    mockUseHandout: vi.fn(),
    mockUseEdit: vi.fn(),
    mockUseDelete: vi.fn(),
    editMutate: vi.fn(),
    deleteMutate: vi.fn(),
    editReset: vi.fn(),
    deleteReset: vi.fn(),
    refetchScene: vi.fn(),
    refetchHandout: vi.fn(),
  }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({
  useHandout: mockUseHandout,
  useEditHandout: mockUseEdit,
  useDeleteHandout: mockUseDelete,
}))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('The porch')] },
      { type: 'paragraph', version: 1, children: [text('A cold draught greets you.')] },
    ],
  },
}

const readAloud: Handout = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door', content }
const textHandout: Handout = { ...readAloud, kind: 'Text', visibility: 'KeeperFacing', title: 'A letter' }
const prepared: Scene = {
  id: 'a1',
  title: 'The Corbitt House',
  location: '',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  handouts: [{ id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }],
}
const active: Scene = { ...prepared, status: 'Active', startedAt: '2026-10-12T19:40:00Z' }
const finished: Scene = { ...active, status: 'Finished', finishedAt: '2026-10-12T21:05:00Z' }

const sceneQuery = (data: Scene | null | undefined, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch: refetchScene, ...overrides })
const handoutQuery = (data: Handout | null | undefined, overrides: Record<string, unknown> = {}) => ({
  data,
  isError: false,
  refetch: refetchHandout,
  ...overrides,
})
const editing = (overrides: Record<string, unknown> = {}) => ({
  mutate: editMutate,
  reset: editReset,
  isPending: false,
  isError: false,
  error: null,
  ...overrides,
})
const deleting = (overrides: Record<string, unknown> = {}) => ({
  mutate: deleteMutate,
  reset: deleteReset,
  isPending: false,
  isError: false,
  error: null,
  ...overrides,
})

const renderPage = () => render(<HandoutPage campaignId="c1" scenarioId="s1" sceneId="a1" handoutId="h1" />)

describe('HandoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue(sceneQuery(prepared))
    mockUseHandout.mockReturnValue(handoutQuery(readAloud))
    mockUseEdit.mockReturnValue(editing())
    mockUseDelete.mockReturnValue(deleting())
  })

  describe('view', () => {
    it('shows one h1 with the title, the Scene, the badges, and a way back (SP-UX-67, SP-UX-76, SP-A11Y-37)', () => {
      renderPage()

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(screen.getByRole('heading', { level: 1, name: 'The front door' })).toBeInTheDocument()
      expect(screen.getByText('Scene: The Corbitt House')).toBeInTheDocument()
      // The kind badge and the panel heading both say "Read-aloud".
      expect(screen.getAllByText('Read-aloud')).toHaveLength(2)
      expect(screen.getByText('Player-facing')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to the Scene' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
    })

    it('shows a Read-aloud Handout in the Read-aloud panel with its headings at h3 (SP-UX-68, SP-A11Y-37)', () => {
      renderPage()

      const panel = screen.getByRole('region', { name: 'Read-aloud' })
      expect(within(panel).getByText('A cold draught greets you.')).toBeInTheDocument()
      expect(within(panel).getByRole('heading', { level: 3, name: 'The porch' })).toBeInTheDocument()
    })

    it('shows a Text Handout under an h2 Text without the panel (SP-UX-68)', () => {
      mockUseHandout.mockReturnValue(handoutQuery(textHandout))

      renderPage()

      expect(screen.getByRole('heading', { level: 2, name: 'Text' })).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Read-aloud' })).not.toBeInTheDocument()
      expect(screen.getByText('Keeper-facing')).toBeInTheDocument()
    })

    it('offers Edit and Delete Handout on a Prepared Scene (SP-UX-71)', () => {
      renderPage()

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Handout' })).toBeInTheDocument()
    })

    it('offers only Edit on an Active Scene and says why it can not be deleted (SP-UX-72)', () => {
      mockUseScene.mockReturnValue(sceneQuery(active))

      renderPage()

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete Handout' })).not.toBeInTheDocument()
      expect(screen.getByText("This Scene has been started, so its Handouts can't be deleted.")).toBeInTheDocument()
    })

    it('offers no action on a Finished Scene and says it can not be changed (SP-UX-73)', () => {
      mockUseScene.mockReturnValue(sceneQuery(finished))

      renderPage()

      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete Handout' })).not.toBeInTheDocument()
      expect(screen.getByText("This Scene is finished and can't be changed.")).toBeInTheDocument()
      expect(screen.getByText('A cold draught greets you.')).toBeInTheDocument()
    })

    it('shows a Skeleton while the Scene or the Handout loads, with aria-busy', () => {
      mockUseScene.mockReturnValue(sceneQuery(undefined))
      const { container, unmount } = renderPage()
      expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
      unmount()

      mockUseScene.mockReturnValue(sceneQuery(prepared))
      mockUseHandout.mockReturnValue(handoutQuery(undefined))
      const second = renderPage()
      expect(second.container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    })

    it('says it could not load the Handout and offers Try again', async () => {
      mockUseHandout.mockReturnValue(handoutQuery(undefined, { isError: true }))
      renderPage()

      expect(screen.getByText("We couldn't load this Handout.")).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(refetchHandout).toHaveBeenCalled()
    })
  })

  describe('not found (SP-UX-74)', () => {
    it('shows the Scene not-found page to a Player and enables no query', () => {
      mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
      expect(mockUseScene).toHaveBeenLastCalledWith('c1', 's1', 'a1', false)
      expect(mockUseHandout).toHaveBeenLastCalledWith('c1', 's1', 'a1', 'h1', false)
    })

    it('shows the Scene not-found page for an unknown Scene', () => {
      mockUseScene.mockReturnValue(sceneQuery(null))

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    })

    it('shows the Handout not-found page for an unknown Handout id', () => {
      mockUseHandout.mockReturnValue(handoutQuery(null))

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Handout" })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to the Scene' })).toBeInTheDocument()
    })

    it('shows the Handout not-found page when a save answers 404', () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new HandoutNotFoundError() }))

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Handout" })).toBeInTheDocument()
    })
  })

  describe('edit', () => {
    it('swaps the content for a prefilled form on Edit, keeps the saved title as the h1, and focuses Title (SP-UX-69, SP-A11Y-40)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByLabelText('Title')).toHaveValue('The front door')
      expect(screen.getByRole('radio', { name: 'Read-aloud' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'Player-facing' })).toBeChecked()
      expect(screen.getByLabelText('Title')).toHaveFocus()
      expect(screen.getByRole('heading', { level: 1, name: 'The front door' })).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Read-aloud' })).not.toBeInTheDocument()
    })

    it('saves, returns to the view with "Handout saved." and moves focus to Edit (SP-UX-69, SP-A11Y-40, SP-A11Y-41)', async () => {
      editMutate.mockImplementation((_input, options) => options.onSuccess())
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await userEvent.click(screen.getByRole('radio', { name: 'Text' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(editMutate.mock.calls[0][0]).toMatchObject({ title: 'The front door', kind: 'Text', visibility: 'PlayerFacing', content })
      expect(screen.getByRole('status')).toHaveTextContent('Handout saved.')
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
    })

    it('discards the edits on Cancel without confirmation and focuses Edit (SP-UX-69)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await userEvent.type(screen.getByLabelText('Title'), ' II')
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(editMutate).not.toHaveBeenCalled()
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'The front door' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })

    it('alerts when the save fails and keeps the form', async () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new Error('boom') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Handout. Try again.")
      expect(screen.getByLabelText('Title')).toBeInTheDocument()
    })

    it('shows the server message at its field', async () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new HandoutValidationError({ title: 'Enter a title.' }) }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title.')
    })

    it('shows the busy label and a disabled button while saving (SP-UX-75)', async () => {
      mockUseEdit.mockReturnValue(editing({ isPending: true }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    })

    it('keeps the form with the Finished conflict, and Cancel refetches the Scene and moves focus to the h1 because Edit may be gone (SP-UX-73, SP-A11Y-40)', async () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new SceneFinishedError() }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel.",
      )
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(refetchScene).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('heading', { level: 1, name: 'The front door' })).toHaveFocus()
    })
  })

  describe('delete', () => {
    it('asks for confirmation naming the Handout, and Cancel keeps it and returns focus to Delete Handout (SP-UX-71, SP-A11Y-40)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Handout' }))
      expect(screen.getByRole('alertdialog', { name: 'Delete The front door?' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(deleteMutate).not.toHaveBeenCalled()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Handout' })).toHaveFocus()
    })

    it('deletes and opens the Scene with "{title} deleted." and focus on the Handouts heading (SP-UX-71, SP-A11Y-40)', async () => {
      deleteMutate.mockImplementation((_variables, options) => options.onSuccess())
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Handout' }))
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Handout' }))

      expect(navigateSpy).toHaveBeenCalledWith({
        to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
        params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
        state: { statusMessage: 'The front door deleted.', focusHandoutsHeading: true },
      })
    })

    it('alerts in the dialog when the delete fails', async () => {
      mockUseDelete.mockReturnValue(deleting({ isError: true, error: new Error('boom') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Handout' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't delete the Handout. Try again.")
    })

    it('shows the busy label and disables the dialog buttons while deleting (SP-UX-75)', async () => {
      mockUseDelete.mockReturnValue(deleting({ isPending: true }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Handout' }))

      expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
    })

    it('says the Scene has been started when the delete is refused, and closing refetches the Scene and moves focus to the h1 (SP-UX-71, SP-A11Y-40)', async () => {
      mockUseDelete.mockReturnValue(deleting({ isError: true, error: new HandoutNotDeletableError() }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Handout' }))
      expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been started, so this Handout can't be deleted.")
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(refetchScene).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'The front door' })).toHaveFocus()
    })
  })
})
