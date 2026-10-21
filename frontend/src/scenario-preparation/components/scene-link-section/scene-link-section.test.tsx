import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import type { RichTextDocument } from '@/shared/types/RichText'

import { SceneLinkSection } from './scene-link-section'

// specs/scenario-preparation/ux.md section 32 and 34; SP-UX-50, SP-UX-56, SP-UX-57, SP-UX-61, SP-A11Y-30, SP-A11Y-33, SP-A11Y-34.

const { mockUseUnlink, unlinkMutate, unlinkReset } = vi.hoisted(() => ({
  mockUseUnlink: vi.fn(),
  unlinkMutate: vi.fn(),
  unlinkReset: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntityLinks', () => ({ useUnlinkNonPlayerEntity: mockUseUnlink }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const description: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('What it looks like')] },
      { type: 'paragraph', version: 1, children: [text('Grey and wet.')] },
    ],
  },
}
const emptyDescription: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }

const ghoul: NonPlayerEntityLink = {
  id: 'l1',
  nonPlayerEntity: { id: 'm1', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: description,
}
const knott: NonPlayerEntityLink = {
  id: 'l2',
  nonPlayerEntity: { id: 'h1', type: 'HumanNpc', name: 'Mr. Knott' },
  playerFacingName: 'The landlord',
  playerFacingDescription: null,
}

const unlinking = (overrides: Record<string, unknown> = {}) => ({
  mutate: unlinkMutate,
  reset: unlinkReset,
  isPending: false,
  isError: false,
  error: null,
  ...overrides,
})

function renderSection(overrides: Partial<Parameters<typeof SceneLinkSection>[0]> = {}) {
  const handlers = { onUnlinked: vi.fn(), onRefetch: vi.fn() }
  render(
    <SceneLinkSection campaignId="c1" scenarioId="s1" sceneId="a1" status="Prepared" links={[ghoul, knott]} {...handlers} {...overrides} />,
  )
  return handlers
}

describe('SceneLinkSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUnlink.mockReturnValue(unlinking())
  })

  it('lists each link with its Player-facing name as an h3, its type and profile as a link, and its description (SP-UX-50, SP-A11Y-30)', () => {
    renderSection()

    const section = screen.getByRole('region', { name: 'Non-Player Entities' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Non-Player Entities' })).toBeInTheDocument()
    expect(within(section).getByText('Only the Player-facing name and description can reach Players, and only when you reveal them.')).toBeInTheDocument()
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByRole('heading', { level: 3, name: 'A shape in the cellar' })).toBeInTheDocument()
    expect(items[0]).toHaveTextContent('Mythos Creature: Ghoul')
    expect(within(items[0]).getByRole('link', { name: 'Ghoul' })).toHaveAttribute('href', '/campaigns/c1/mythos-creatures/m1')
    expect(within(items[0]).getByText('Grey and wet.')).toBeInTheDocument()
    expect(items[1]).toHaveTextContent('Human NPC: Mr. Knott')
    expect(within(items[1]).getByRole('link', { name: 'Mr. Knott' })).toHaveAttribute('href', '/campaigns/c1/human-npcs/h1')
  })

  it('renders the description headings one level lower, as h4 and h5 under the h3 (SP-A11Y-30)', () => {
    const subheading = { type: 'heading', version: 1, tag: 'h4', children: [text('Smell')] }
    const document: RichTextDocument = { root: { type: 'root', children: [description.root.children[0], subheading] } }
    renderSection({ links: [{ ...ghoul, playerFacingDescription: document }] })

    expect(screen.getByRole('heading', { level: 4, name: 'What it looks like' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 5, name: 'Smell' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'What it looks like' })).not.toBeInTheDocument()
  })

  it('says there is no description for a link without one or with an empty one', () => {
    renderSection({ links: [knott, { ...ghoul, id: 'l3', playerFacingDescription: emptyDescription }] })

    expect(screen.getAllByText('No Player-facing description yet.')).toHaveLength(2)
  })

  it('says nothing is linked yet and still offers the action when there are no links (SP-UX-50)', () => {
    renderSection({ links: [] })

    expect(screen.getByText('No Non-Player Entities linked yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Link a Non-Player Entity' })).toHaveAttribute(
      'href',
      '/campaigns/c1/scenarios/s1/scenes/a1/non-player-entity-links/new',
    )
  })

  it.each(['Prepared', 'Active'] as const)('offers Link, Edit, and Unlink on a %s Scene, with the name in the accessible names (SP-A11Y-34)', (status) => {
    renderSection({ status })

    expect(screen.getByRole('link', { name: 'Link a Non-Player Entity' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit A shape in the cellar' })).toHaveAttribute(
      'href',
      '/campaigns/c1/scenarios/s1/scenes/a1/non-player-entity-links/l1',
    )
    expect(screen.getByRole('button', { name: 'Unlink A shape in the cellar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit The landlord' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlink The landlord' })).toBeInTheDocument()
  })

  it('shows the links of a Finished Scene without Link, Edit, or Unlink (SP-UX-57)', () => {
    renderSection({ status: 'Finished' })

    expect(screen.getByRole('heading', { level: 3, name: 'A shape in the cellar' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Link a Non-Player Entity' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Unlink / })).not.toBeInTheDocument()
  })

  it('wraps a long Player-facing name instead of overflowing (SP-A11Y-36)', () => {
    renderSection({ links: [{ ...ghoul, playerFacingName: 'x'.repeat(200) }] })

    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('break-words')
  })

  it('moves focus to the heading of the link named by focusLinkId (SP-A11Y-33)', () => {
    renderSection({ focusLinkId: 'l2' })

    expect(screen.getByRole('heading', { level: 3, name: 'The landlord' })).toHaveFocus()
  })

  describe('unlink', () => {
    it('asks first, and Cancel keeps the link and returns focus to Unlink (SP-UX-56, SP-A11Y-33)', async () => {
      renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Unlink A shape in the cellar' }))
      expect(screen.getByRole('alertdialog', { name: 'Unlink A shape in the cellar?' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(unlinkMutate).not.toHaveBeenCalled()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Unlink A shape in the cellar' })).toHaveFocus())
    })

    it('confirming unlinks, reports the name, and moves focus to the section heading (SP-UX-56, SP-A11Y-33)', async () => {
      unlinkMutate.mockImplementation((_variables: undefined, options: { onSuccess: () => void }) => options.onSuccess())
      const { onUnlinked } = renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Unlink The landlord' }))
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Unlink' }))

      expect(onUnlinked).toHaveBeenCalledWith('The landlord')
      await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Non-Player Entities' })).toHaveFocus())
    })

    it('disables the dialog buttons while unlinking so a second activation does nothing (SP-UX-61)', async () => {
      mockUseUnlink.mockReturnValue(unlinking({ isPending: true }))
      renderSection({ links: [ghoul] })

      await userEvent.click(screen.getByRole('button', { name: 'Unlink A shape in the cellar' }))

      expect(screen.getByRole('button', { name: 'Unlinking...' })).toBeDisabled()
    })

    it('alerts on a failure and keeps the link', async () => {
      mockUseUnlink.mockReturnValue(unlinking({ isError: true, error: new Error('boom') }))
      renderSection({ links: [ghoul] })

      await userEvent.click(screen.getByRole('button', { name: 'Unlink A shape in the cellar' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't unlink A shape in the cellar. Try again.")
    })

    it('refuses when the Scene was finished meanwhile, and closing it refetches the Scene (SP-UX-57)', async () => {
      mockUseUnlink.mockReturnValue(unlinking({ isError: true, error: new SceneFinishedError() }))
      const { onRefetch } = renderSection({ links: [ghoul] })

      await userEvent.click(screen.getByRole('button', { name: 'Unlink A shape in the cellar' }))
      expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been finished, so it can't be changed.")
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onRefetch).toHaveBeenCalledTimes(1)
    })
  })
})
