import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import { NON_PLAYER_ENTITY_TYPE_LABELS } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'
import { routerState } from '@/shared/test-support/routerMock'

import { MaterialEntry, MaterialEntryList } from './material-entry'

// specs/scenario-preparation/ux.md section 72 (PBI-SPL-005 design record D2): one entry for a Scene's Handouts,
// Non-Player Entity links, and Items, with the same title, second line, and order on the Scene page and the Active
// Scene; only the action and status differ by context.
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/shared/hooks/useSidePanel', () => ({ useSidePanel: () => ({ panel: null, open: mockOpen, close: vi.fn() }) }))

const handout: HandoutSummary = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }
const link: NonPlayerEntityLink = {
  id: 'l1',
  nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Thug' },
  playerFacingName: 'The man by the gate',
  playerFacingDescription: null,
}
const itemLink: ItemLink = { id: 'i1', item: { id: 't1', name: 'A brass key', holder: null, handouts: [] } }
const itemHandout: HandoutSummary = { id: 'h2', kind: 'Text', visibility: 'PlayerFacing', title: 'A folded note' }

function showEntry(ui: ReactElement) {
  return render(ui)
}

describe('MaterialEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
  })

  it('renders the title in an h3 by default and at the given heading level, shifted by the offset provider', () => {
    const { rerender } = showEntry(<MaterialEntry subject={{ type: 'handout', handout }} titleId="handout-link-h1" />)
    expect(screen.getByRole('heading', { level: 3, name: 'The front door' })).toBeInTheDocument()

    rerender(<MaterialEntry subject={{ type: 'handout', handout }} titleId="handout-link-h1" headingLevel={2} />)
    expect(screen.getByRole('heading', { level: 2, name: 'The front door' })).toBeInTheDocument()

    rerender(
      <HeadingOffsetProvider value={1}>
        <MaterialEntry subject={{ type: 'handout', handout }} titleId="handout-link-h1" />
      </HeadingOffsetProvider>,
    )
    expect(screen.getByRole('heading', { level: 4, name: 'The front door' })).toBeInTheDocument()
  })

  it('shows a Handout subject with its kind and visibility badges', () => {
    showEntry(<MaterialEntry subject={{ type: 'handout', handout }} titleId="handout-link-h1" />)

    expect(screen.getByText('Read-aloud')).toBeInTheDocument()
    expect(screen.getByText('Player-facing')).toBeInTheDocument()
  })

  it('shows an entity subject with "{type label}: {profile name}" as plain text with no link', () => {
    showEntry(<MaterialEntry subject={{ type: 'entity', link }} titleId="entity-link-l1" />)

    const secondLine = screen.getByText(`${NON_PLAYER_ENTITY_TYPE_LABELS.HumanNpc}: Thug`)
    expect(secondLine).toBeInTheDocument()
    expect(secondLine.tagName).toBe('P')
    expect(within(secondLine).queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows an Item subject with the "Item" badge', () => {
    showEntry(<MaterialEntry subject={{ type: 'item', link: itemLink }} titleId="item-link-i1" />)

    expect(screen.getByText('Item')).toBeInTheDocument()
  })

  it('shows an Item Handout subject with its badges and the owning Item (SPL-UX-51)', () => {
    showEntry(<MaterialEntry subject={{ type: 'itemHandout', link: itemLink, handout: itemHandout }} titleId="handout-link-h2" />)

    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Player-facing')).toBeInTheDocument()
    expect(screen.getByText('Item: A brass key')).toBeInTheDocument()
  })

  it('renders a panel title as a button with aria-haspopup="dialog" that opens the handout panel with its trigger (SP-A11Y-60)', async () => {
    const user = userEvent.setup()
    showEntry(<MaterialEntry subject={{ type: 'handout', handout }} titleId="handout-link-h1" />)

    const title = screen.getByRole('button', { name: 'The front door' })
    expect(title).toHaveAttribute('id', 'handout-link-h1')
    expect(title).toHaveAttribute('aria-haspopup', 'dialog')

    await user.click(title)
    expect(mockOpen).toHaveBeenCalledWith({ type: 'handout', handoutId: 'h1' }, title)
  })

  it('opens the entity panel from an entity title', async () => {
    const user = userEvent.setup()
    showEntry(<MaterialEntry subject={{ type: 'entity', link }} titleId="entity-link-l1" />)

    const title = screen.getByRole('button', { name: 'The man by the gate' })
    expect(title).toHaveAttribute('id', 'entity-link-l1')

    await user.click(title)
    expect(mockOpen).toHaveBeenCalledWith({ type: 'entity', linkId: 'l1' }, title)
  })

  it('opens the item panel from an Item title (SPL-UX-51)', async () => {
    const user = userEvent.setup()
    showEntry(<MaterialEntry subject={{ type: 'item', link: itemLink }} titleId="item-link-i1" />)

    const title = screen.getByRole('button', { name: 'A brass key' })
    expect(title).toHaveAttribute('id', 'item-link-i1')
    expect(title).toHaveAttribute('aria-haspopup', 'dialog')

    await user.click(title)
    expect(mockOpen).toHaveBeenCalledWith({ type: 'item', itemId: 't1' }, title)
  })

  it('opens the handout panel from an Item Handout title (SPL-UX-51)', async () => {
    const user = userEvent.setup()
    showEntry(<MaterialEntry subject={{ type: 'itemHandout', link: itemLink, handout: itemHandout }} titleId="handout-link-h2" />)

    const title = screen.getByRole('button', { name: 'A folded note' })
    expect(title).toHaveAttribute('id', 'handout-link-h2')

    await user.click(title)
    expect(mockOpen).toHaveBeenCalledWith({ type: 'handout', handoutId: 'h2' }, title)
  })

  it('renders the status and action slots when given and omits them otherwise', () => {
    const { rerender } = showEntry(<MaterialEntry subject={{ type: 'handout', handout }} titleId="handout-link-h1" />)
    expect(screen.queryByText('Revealed to Harvey Walters')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reveal The front door' })).not.toBeInTheDocument()

    rerender(
      <MaterialEntry
        subject={{ type: 'handout', handout }}
        titleId="handout-link-h1"
        status={<p>Revealed to Harvey Walters</p>}
        action={
          <button type="button" aria-label="Reveal The front door">
            Reveal...
          </button>
        }
      />,
    )
    expect(screen.getByText('Revealed to Harvey Walters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal The front door' })).toBeInTheDocument()
  })
})

describe('MaterialEntryList', () => {
  it('renders an ol or a ul in one bordered list with divided rows', () => {
    const { rerender } = render(
      <MaterialEntryList as="ol">
        <MaterialEntry subject={{ type: 'handout', handout }} titleId="handout-link-h1" />
      </MaterialEntryList>,
    )

    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    expect(list).toHaveClass('divide-y')
    expect(list.parentElement).toHaveClass('border')

    rerender(
      <MaterialEntryList as="ul">
        <MaterialEntry subject={{ type: 'entity', link }} titleId="entity-link-l1" />
      </MaterialEntryList>,
    )
    expect(screen.getByRole('list').tagName).toBe('UL')
  })
})
