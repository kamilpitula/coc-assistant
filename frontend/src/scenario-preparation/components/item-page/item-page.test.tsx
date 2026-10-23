import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemNotDeletableError, ItemNotFoundError, ItemValidationError } from '@/scenario-preparation/services/itemApi'
import type { Item } from '@/scenario-preparation/types/Item'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'
import type { RichTextDocument } from '@/shared/types/RichText'

import { ItemPage } from './item-page'

// specs/scenario-preparation/ux.md sections 63 and 65; SP-UX-93 to SP-UX-96, SP-UX-100 to SP-UX-103, SP-A11Y-51, SP-A11Y-53 to SP-A11Y-55.

const { mockUseCampaign, mockUseItem, mockUseEdit, mockUseDelete, mockUseReorder, editMutate, deleteMutate, editReset, deleteReset, refetchItem } = vi.hoisted(
  () => ({
    mockUseCampaign: vi.fn(),
    mockUseItem: vi.fn(),
    mockUseEdit: vi.fn(),
    mockUseDelete: vi.fn(),
    mockUseReorder: vi.fn(),
    editMutate: vi.fn(),
    deleteMutate: vi.fn(),
    editReset: vi.fn(),
    deleteReset: vi.fn(),
    refetchItem: vi.fn(),
  }),
)

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItem: mockUseItem, useEditItem: mockUseEdit, useDeleteItem: mockUseDelete }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useReorderHandouts: mockUseReorder }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const doc = (heading: string, body: string): RichTextDocument => ({
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text(heading)] },
      { type: 'paragraph', version: 1, children: [text(body)] },
    ],
  },
})

const diary: Item = {
  id: 'k1',
  name: "Walter Corbitt's diary",
  playerFacingDescription: doc('The diary', 'A leather diary with a torn last page.'),
  keeperNotes: doc('Secret', 'The missing page names the cellar.'),
  holder: null,
  handouts: [{ id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }],
  scenes: [
    { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status: 'Active' },
    { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a2', title: 'The cellar', status: 'Prepared' },
  ],
}

const itemQuery = (data: Item | null | undefined, overrides: Record<string, unknown> = {}) => ({
  data,
  isError: false,
  refetch: refetchItem,
  dataUpdatedAt: 1,
  ...overrides,
})
const editing = (overrides: Record<string, unknown> = {}) => ({ mutate: editMutate, reset: editReset, isPending: false, isError: false, error: null, ...overrides })
const deleting = (overrides: Record<string, unknown> = {}) => ({ mutate: deleteMutate, reset: deleteReset, isPending: false, isError: false, error: null, ...overrides })

const renderPage = () => render(<ItemPage campaignId="c1" itemId="k1" />)
// The Handouts section has its own status region for moves; the page's status paragraph comes first.
const pageStatus = () => screen.getAllByRole('status')[0]

describe('ItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseItem.mockReturnValue(itemQuery(diary))
    mockUseEdit.mockReturnValue(editing())
    mockUseDelete.mockReturnValue(deleting())
    mockUseReorder.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  describe('view', () => {
    it('shows one h1 with the name, a way back, and "Held by no one." (SP-UX-93, SP-A11Y-51)', () => {
      renderPage()

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(screen.getByRole('heading', { level: 1, name: "Walter Corbitt's diary" })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to Items' })).toHaveAttribute('href', '/campaigns/c1/items')
      expect(screen.getByText('Held by no one.')).toBeInTheDocument()
    })

    it('shows the sections in order: description, Keeper notes, Handouts, Scenes, then Edit and Delete Item (SP-UX-93)', () => {
      renderPage()

      const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
      expect(headings).toEqual(['Player-facing description', 'Keeper notes', 'Handouts', 'Scenes'])
      const buttons = screen.getAllByRole('button').map((button) => button.textContent)
      expect(buttons.slice(-2)).toEqual(['Edit', 'Delete Item'])
    })

    it('renders the rich text with its headings below the h2 sections, at h3 (SP-A11Y-51)', () => {
      renderPage()

      expect(screen.getByRole('heading', { level: 3, name: 'The diary' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Secret' })).toBeInTheDocument()
      expect(screen.getByText('A leather diary with a torn last page.')).toBeInTheDocument()
    })

    it('says there are no Keeper notes yet when there are none or they hold no text', () => {
      mockUseItem.mockReturnValue(itemQuery({ ...diary, keeperNotes: null }))
      renderPage()

      expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
    })

    it('lists the Handouts in the shared section, with Add Handout, for an Item that is part of a played Scene (SP-UX-100)', () => {
      renderPage()

      const section = screen.getByRole('region', { name: 'Handouts' })
      expect(within(section).getByRole('link', { name: 'The last entry' })).toHaveAttribute('href', '/campaigns/c1/items/k1/handouts/h1')
      expect(within(section).getByRole('link', { name: 'Add Handout' })).toHaveAttribute('href', '/campaigns/c1/items/k1/handouts/new')
    })

    it('lists the Scenes that link the Item, read-only (SP-UX-96)', () => {
      renderPage()

      const section = screen.getByRole('region', { name: 'Scenes' })
      expect(within(section).getAllByRole('link').map((link) => link.textContent)).toEqual(['The Corbitt House', 'The cellar'])
      expect(within(section).queryByRole('button')).not.toBeInTheDocument()
    })

    it('always offers Edit and Delete Item, whatever the status of the Scenes (SP-UX-94)', () => {
      renderPage()

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Item' })).toBeInTheDocument()
    })

    it('announces the status message of the page that navigated here, such as "Item created." (SP-UX-92, SP-A11Y-53)', () => {
      routerState.location.state = { statusMessage: 'Item created.' }

      renderPage()

      expect(pageStatus()).toHaveTextContent('Item created.')
    })

    it('shows a Skeleton with aria-busy while loading', () => {
      mockUseItem.mockReturnValue(itemQuery(undefined))

      const { container } = renderPage()

      expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    })

    it('says it could not load the Item and offers Try again', async () => {
      mockUseItem.mockReturnValue(itemQuery(undefined, { isError: true }))
      renderPage()

      expect(screen.getByText("We couldn't load this Item.")).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(refetchItem).toHaveBeenCalled()
    })
  })

  describe('not found (SP-UX-102)', () => {
    it('shows the Item not-found page to a Player and enables no query', () => {
      mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeInTheDocument()
      expect(mockUseItem).toHaveBeenLastCalledWith('c1', 'k1', false)
    })

    it('shows the Item not-found page for an unknown Item or one of another Campaign', () => {
      mockUseItem.mockReturnValue(itemQuery(null))

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeInTheDocument()
    })

    it('shows the Item not-found page when a save answers 404', () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new ItemNotFoundError() }))

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeInTheDocument()
    })
  })

  describe('edit', () => {
    it('swaps the content for a prefilled form on Edit, keeps the saved name as the h1, and focuses Name (SP-UX-94, SP-A11Y-54)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByLabelText('Name')).toHaveValue("Walter Corbitt's diary")
      expect(screen.getByLabelText('Name')).toHaveFocus()
      expect(screen.getByRole('heading', { level: 1, name: "Walter Corbitt's diary" })).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Handouts' })).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Scenes' })).not.toBeInTheDocument()
    })

    it('saves, returns to the view with "Item saved." and moves focus to Edit (SP-UX-94, SP-A11Y-54)', async () => {
      editMutate.mockImplementation((_input, options) => options.onSuccess())
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await userEvent.type(screen.getByLabelText('Name'), ' II')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(editMutate.mock.calls[0][0]).toMatchObject({ name: "Walter Corbitt's diary II" })
      expect(pageStatus()).toHaveTextContent('Item saved.')
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
    })

    it('discards the edits on Cancel without confirmation and focuses Edit (SP-UX-94, SP-A11Y-54)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      await userEvent.type(screen.getByLabelText('Name'), ' II')
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(editMutate).not.toHaveBeenCalled()
      expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: "Walter Corbitt's diary" })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus()
      expect(pageStatus()).toBeEmptyDOMElement()
    })

    it('alerts when the save fails and keeps the form (SP-UX-94)', async () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new Error('boom') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the Item. Try again.")
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
    })

    it('shows the server message at its field (SP-UX-94, SP-A11Y-55)', async () => {
      mockUseEdit.mockReturnValue(editing({ isError: true, error: new ItemValidationError({ name: 'Name must be 200 characters or fewer.' }) }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
        'Players see the name when you reveal or give this Item. Name must be 200 characters or fewer.',
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows the busy label and a disabled button while saving', async () => {
      mockUseEdit.mockReturnValue(editing({ isPending: true }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    })
  })

  describe('delete', () => {
    it('asks for confirmation naming the Item, and Cancel keeps it and returns focus to Delete Item (SP-UX-95, SP-A11Y-54)', async () => {
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Item' }))
      expect(screen.getByRole('alertdialog', { name: "Delete Walter Corbitt's diary?" })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(deleteMutate).not.toHaveBeenCalled()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Item' })).toHaveFocus()
    })

    it('deletes and opens the list with "{name} deleted." (SP-UX-95)', async () => {
      deleteMutate.mockImplementation((_variables, options) => options.onSuccess())
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Item' }))
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

      expect(navigateSpy).toHaveBeenCalledWith({
        to: '/campaigns/$campaignId/items',
        params: { campaignId: 'c1' },
        state: { statusMessage: "Walter Corbitt's diary deleted." },
      })
    })

    it('alerts in the dialog when the delete fails', async () => {
      mockUseDelete.mockReturnValue(deleting({ isError: true, error: new Error('boom') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Item' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't delete Walter Corbitt's diary. Try again.")
    })

    it('shows the busy label and disables the dialog buttons while deleting', async () => {
      mockUseDelete.mockReturnValue(deleting({ isPending: true }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Item' }))

      expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
    })

    it('says a Scene has been played when the delete is refused, disables Delete, and closing reloads the Item (SP-UX-95)', async () => {
      mockUseDelete.mockReturnValue(deleting({ isError: true, error: new ItemNotDeletableError('played') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Item' }))
      expect(screen.getByRole('alert')).toHaveTextContent("Walter Corbitt's diary is part of a Scene that has been played, so it can't be deleted.")
      expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' })).toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(refetchItem).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('says an Investigator holds the Item when that is why the delete is refused (SP-UX-95)', async () => {
      mockUseDelete.mockReturnValue(deleting({ isError: true, error: new ItemNotDeletableError('held') }))
      renderPage()

      await userEvent.click(screen.getByRole('button', { name: 'Delete Item' }))

      expect(screen.getByRole('alert')).toHaveTextContent("Walter Corbitt's diary is held by an Investigator, so it can't be deleted.")
    })
  })

  describe('copy (SP-UX-103)', () => {
    it('never calls an Item Gear, loot, inventory, an artifact, or an object', () => {
      const { container } = renderPage()

      expect(container.textContent).not.toMatch(/\b(gear|loot|inventory|artifact|object)\b/i)
    })
  })
})
