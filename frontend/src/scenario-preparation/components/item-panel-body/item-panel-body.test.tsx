import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Item } from '@/scenario-preparation/types/Item'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { ItemPanelBody } from './item-panel-body'

// specs/scene-play/ux.md section 22.5: the Item's side panel body shows what Players see, the holder, the Handouts,
// and the Keeper notes, and links to the full page with `from` only when the host passes one.
const { mockUseItem, mockUseHolderNames, refetchItem, refetchNames } = vi.hoisted(() => ({
  mockUseItem: vi.fn(),
  mockUseHolderNames: vi.fn(),
  refetchItem: vi.fn(),
  refetchNames: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItem: mockUseItem }))
vi.mock('@/campaign-play/hooks/useApprovedInvestigatorNames', () => ({ useApprovedInvestigatorNames: mockUseHolderNames }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const description = {
  root: {
    type: 'root' as const,
    children: [{ type: 'paragraph', version: 1, children: [text("Walter Corbitt's diary.")] }],
  },
}
const note = {
  root: {
    type: 'root' as const,
    children: [{ type: 'paragraph', version: 1, children: [text('The diary bites back.')] }],
  },
}

const item = (overrides: Partial<Item> = {}): Item => ({
  id: 'k1',
  name: "Walter Corbitt's diary",
  playerFacingDescription: description,
  keeperNotes: note,
  holder: { investigatorId: 'i1' },
  handouts: [{ id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }],
  scenes: [],
  ...overrides,
})

const holderNames = new Map([['i1', 'Harvey Walters']])
const namesQuery = (names: Map<string, string> | undefined, overrides: Record<string, unknown> = {}) => ({
  names,
  isError: false,
  refetch: refetchNames,
  ...overrides,
})

function show(props: { from?: 'active-scene'; action?: React.ReactNode; statusLine?: string | null } = {}) {
  return render(
    <SidePanelScopeProvider>
      <ItemPanelBody campaignId="c1" itemId="k1" {...props} />
    </SidePanelScopeProvider>,
  )
}

describe('ItemPanelBody', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseItem.mockReturnValue({ data: item(), isError: false, refetch: refetchItem })
    mockUseHolderNames.mockReturnValue(namesQuery(holderNames))
  })

  it('shows what Players see with the description from h4, the holder, the Handouts, and the Keeper notes', () => {
    show()

    expect(screen.getByText('Item')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: "Walter Corbitt's diary" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'What Players see' })).toBeInTheDocument()
    expect(screen.getByText("Walter Corbitt's diary.")).toBeInTheDocument()
    expect(screen.getByText('Held by Harvey Walters.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Handouts' })).toBeInTheDocument()
    expect(screen.getByText('The last entry')).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.getByText('The diary bites back.')).toBeInTheDocument()
  })

  it('says who holds nothing and what is missing', () => {
    mockUseItem.mockReturnValue({ data: item({ holder: null, handouts: [], keeperNotes: null }), isError: false, refetch: refetchItem })
    show()

    expect(screen.getByText('Held by no one.')).toBeInTheDocument()
    expect(screen.getByText('No Handouts.')).toBeInTheDocument()
    expect(screen.getByText('No Keeper notes yet.')).toBeInTheDocument()
  })

  it('calls a holder outside the Approved Investigators "Unnamed Investigator"', () => {
    mockUseHolderNames.mockReturnValue(namesQuery(new Map()))
    show()

    expect(screen.getByText('Held by Unnamed Investigator.')).toBeInTheDocument()
  })

  it('shows an error with a retry when the holder names fail to load', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    mockUseHolderNames.mockReturnValue(namesQuery(undefined, { isError: true }))
    show()

    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetchNames).toHaveBeenCalled()
  })

  it('carries `from` to the full page only when the host passes one, and shows the status line and action', () => {
    show({ from: 'active-scene', statusLine: 'Revealed to Harvey Walters', action: <button type="button">Reveal...</button> })

    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/items/k1?from=active-scene')
    expect(screen.getByText('Revealed to Harvey Walters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal...' })).toBeInTheDocument()
  })

  it('links to the full page without `from` when the host passes none', () => {
    show()

    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/items/k1')
  })

  it('reads the Item by its ids and resolves the holder name from the Approved Investigators', () => {
    show()

    expect(mockUseItem).toHaveBeenCalledWith('c1', 'k1', true)
    expect(mockUseHolderNames).toHaveBeenCalledWith('c1')
  })

  it('shows loading while the Item or the names load, error with a retry, and not-found for an unknown Item', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    mockUseItem.mockReturnValue({ data: undefined, isError: false, refetch: refetchItem })
    const { unmount } = show()
    expect(screen.getAllByText('Item')).toHaveLength(2)
    unmount()

    mockUseItem.mockReturnValue({ data: item(), isError: false, refetch: refetchItem })
    mockUseHolderNames.mockReturnValue(namesQuery(undefined))
    const second = show()
    expect(screen.getAllByText('Item')).toHaveLength(2)
    second.unmount()

    mockUseHolderNames.mockReturnValue(namesQuery(holderNames))
    mockUseItem.mockReturnValue({ data: undefined, isError: true, refetch: refetchItem })
    const third = show()
    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetchItem).toHaveBeenCalled()
    expect(refetchNames).toHaveBeenCalled()
    third.unmount()

    mockUseItem.mockReturnValue({ data: null, isError: false, refetch: refetchItem })
    show()
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
  })
})
