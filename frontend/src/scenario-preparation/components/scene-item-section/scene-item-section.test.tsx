import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { ItemLink } from '@/scenario-preparation/types/Item'

import { SceneItemSection } from './scene-item-section'

// specs/scenario-preparation/ux.md sections 64.1 and 64.3; SP-UX-97, SP-UX-99, SP-A11Y-51, SP-A11Y-54, SP-A11Y-56.

const { mockUseUnlink, unlinkMutate, unlinkReset } = vi.hoisted(() => ({
  mockUseUnlink: vi.fn(),
  unlinkMutate: vi.fn(),
  unlinkReset: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useItemLinks', () => ({ useUnlinkItem: mockUseUnlink }))

const diary: ItemLink = { id: 'l1', item: { id: 'k1', name: "Walter Corbitt's diary" } }
const key: ItemLink = { id: 'l2', item: { id: 'k2', name: 'The cellar key' } }

const unlinking = (overrides: Record<string, unknown> = {}) => ({ mutate: unlinkMutate, reset: unlinkReset, isPending: false, isError: false, error: null, ...overrides })

function renderSection(overrides: Partial<Parameters<typeof SceneItemSection>[0]> = {}) {
  const handlers = { onUnlinked: vi.fn(), onRefetch: vi.fn() }
  render(<SceneItemSection campaignId="c1" scenarioId="s1" sceneId="a1" status="Prepared" links={[diary, key]} {...handlers} {...overrides} />)
  return handlers
}

describe('SceneItemSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUnlink.mockReturnValue(unlinking())
  })

  it('is a section labelled by an h2 "Items" with the hint that Players see an Item only when revealed or given (SP-UX-97, SP-A11Y-51)', () => {
    renderSection()

    const section = screen.getByRole('region', { name: 'Items' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Items' })).toBeInTheDocument()
    expect(within(section).getByText("Players see an Item's name and description only when you reveal or give it.")).toBeInTheDocument()
  })

  it('lists the Items in the order linked, each name a link to its Item page (SP-UX-97)', () => {
    renderSection()

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getAllByRole('link')[0].textContent)).toEqual(["Walter Corbitt's diary", 'The cellar key'])
    expect(within(items[0]).getByRole('link', { name: "Walter Corbitt's diary" })).toHaveAttribute('href', '/campaigns/c1/items/k1')
  })

  it('says nothing is linked yet and still offers the action (SP-UX-97)', () => {
    renderSection({ links: [] })

    expect(screen.getByText('No Items linked yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Link an Item' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1/item-links/new')
  })

  it.each(['Prepared', 'Active'] as const)('offers Link an Item and Unlink, named by the Item, on a %s Scene (SP-UX-97, SP-A11Y-56)', (status) => {
    renderSection({ status })

    expect(screen.getByRole('link', { name: 'Link an Item' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Unlink Walter Corbitt's diary" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlink The cellar key' })).toBeInTheDocument()
  })

  it('shows the Items of a Finished Scene without Link an Item or Unlink (SP-UX-97)', () => {
    renderSection({ status: 'Finished' })

    expect(screen.getByRole('link', { name: "Walter Corbitt's diary" })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Link an Item' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Unlink / })).not.toBeInTheDocument()
  })

  it('lets a long Item name wrap instead of overflowing (SP-A11Y-57)', () => {
    renderSection({ links: [{ id: 'l9', item: { id: 'k9', name: 'x'.repeat(200) } }] })

    expect(screen.getByRole('link', { name: 'x'.repeat(200) })).toHaveClass('break-words')
  })

  it('moves focus to the link of the Item named by focusLinkId once it is listed (SP-UX-98, SP-A11Y-54)', () => {
    renderSection({ focusLinkId: 'l2' })

    expect(screen.getByRole('link', { name: 'The cellar key' })).toHaveFocus()
  })

  describe('unlink', () => {
    it('asks first, and Cancel keeps the link and returns focus to Unlink (SP-UX-99, SP-A11Y-54)', async () => {
      renderSection()

      await userEvent.click(screen.getByRole('button', { name: "Unlink Walter Corbitt's diary" }))
      expect(screen.getByRole('alertdialog', { name: "Unlink Walter Corbitt's diary?" })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(unlinkMutate).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.getByRole('button', { name: "Unlink Walter Corbitt's diary" })).toHaveFocus())
    })

    it('names the link and its Item for the hook that unlinks', async () => {
      renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Unlink The cellar key' }))

      expect(mockUseUnlink).toHaveBeenCalledWith('c1', 's1', 'a1', { id: 'l2', itemId: 'k2' })
    })

    it('confirming unlinks, reports the name, and moves focus to the section heading (SP-UX-99, SP-A11Y-54)', async () => {
      unlinkMutate.mockImplementation((_variables: undefined, options: { onSuccess: () => void }) => options.onSuccess())
      const { onUnlinked } = renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Unlink The cellar key' }))
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Unlink' }))

      expect(onUnlinked).toHaveBeenCalledWith('The cellar key')
      await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Items' })).toHaveFocus())
    })

    it('disables the dialog buttons while unlinking so a second activation does nothing', async () => {
      mockUseUnlink.mockReturnValue(unlinking({ isPending: true }))
      renderSection({ links: [diary] })

      await userEvent.click(screen.getByRole('button', { name: "Unlink Walter Corbitt's diary" }))

      expect(screen.getByRole('button', { name: 'Unlinking...' })).toBeDisabled()
    })

    it('alerts on a failure and keeps the link', async () => {
      mockUseUnlink.mockReturnValue(unlinking({ isError: true, error: new Error('boom') }))
      renderSection({ links: [diary] })

      await userEvent.click(screen.getByRole('button', { name: "Unlink Walter Corbitt's diary" }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't unlink Walter Corbitt's diary. Try again.")
    })

    it('refuses when the Scene was finished meanwhile, and closing it refetches the Scene (SP-UX-99)', async () => {
      mockUseUnlink.mockReturnValue(unlinking({ isError: true, error: new SceneFinishedError() }))
      const { onRefetch } = renderSection({ links: [diary] })

      await userEvent.click(screen.getByRole('button', { name: "Unlink Walter Corbitt's diary" }))
      expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been finished, so it can't be changed.")
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onRefetch).toHaveBeenCalledTimes(1)
    })
  })
})
