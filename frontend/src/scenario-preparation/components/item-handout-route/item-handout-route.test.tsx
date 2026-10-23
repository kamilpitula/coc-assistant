import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { itemHandoutContext } from '@/scenario-preparation/services/handoutOwnerContext'
import { diary, diaryLinkedTo } from '@/scenario-preparation/test-support/itemFixtures'
import type { Item } from '@/scenario-preparation/types/Item'

import { ItemHandoutRoute } from './item-handout-route'

// specs/scenario-preparation/ux.md section 65; SP-UX-100, SP-UX-102: a Player and an unknown Item get the Item not-found page and no
// request; a loaded Item decides what the Handout pages offer.

const { mockUseCampaign, mockUseItemHandoutContext, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseItemHandoutContext: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useItemHandoutContext', () => ({ useItemHandoutContext: mockUseItemHandoutContext }))
vi.mock('@/scenario-preparation/components/handout-page/handout-page', () => ({
  HandoutPage: ({ handoutId, context }: { handoutId: string; context: { backLabel: string; canDelete: boolean } }) => (
    <p>
      Handout page {handoutId} {context.backLabel} {context.canDelete ? 'can delete' : 'cannot delete'}
    </p>
  ),
}))
vi.mock('@/scenario-preparation/components/add-handout-page/add-handout-page', () => ({
  AddHandoutPage: ({ context }: { context: { backLabel: string } }) => <p>Add Handout page {context.backLabel}</p>,
}))

const loaded = (item: Item) => ({ item: { data: item, isError: false, refetch }, context: itemHandoutContext(item, refetch) })
const pending = { item: { data: undefined, isError: false, refetch }, context: null }

const renderRoute = (handoutId?: string) => render(<ItemHandoutRoute campaignId="c1" itemId="k1" handoutId={handoutId} />)

describe('ItemHandoutRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseItemHandoutContext.mockReturnValue(loaded(diary))
  })

  it('shows the Handout page for a Handout id, with a way back to the Item and Delete allowed', () => {
    renderRoute('h1')

    expect(screen.getByText('Handout page h1 Back to the Item can delete')).toBeInTheDocument()
  })

  it('does not allow a Handout delete for an Item that is part of a played Scene (SP-UX-100)', () => {
    mockUseItemHandoutContext.mockReturnValue(loaded(diaryLinkedTo('Active')))

    renderRoute('h1')

    expect(screen.getByText('Handout page h1 Back to the Item cannot delete')).toBeInTheDocument()
  })

  it('shows the Add Handout page without a Handout id', () => {
    renderRoute()

    expect(screen.getByText('Add Handout page Back to the Item')).toBeInTheDocument()
  })

  it('asks for the Item of the owner and enables the query for the Keeper', () => {
    renderRoute('h1')

    expect(mockUseItemHandoutContext).toHaveBeenLastCalledWith({ type: 'item', campaignId: 'c1', itemId: 'k1' }, true)
  })

  it('shows the Item not-found page to a Player and enables no query (SP-UX-102)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

    renderRoute('h1')

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeInTheDocument()
    expect(mockUseItemHandoutContext).toHaveBeenLastCalledWith(expect.objectContaining({ itemId: 'k1' }), false)
  })

  it('shows the Item not-found page for an unknown Item (SP-UX-102)', () => {
    mockUseItemHandoutContext.mockReturnValue({ item: { data: null, isError: false, refetch }, context: null })

    renderRoute()

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Item" })).toBeInTheDocument()
  })

  it('shows a Skeleton with aria-busy while the Item loads', () => {
    mockUseItemHandoutContext.mockReturnValue(pending)

    const { container } = renderRoute('h1')

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('says it could not load the Handout and offers Try again when the Item fails to load', () => {
    mockUseItemHandoutContext.mockReturnValue({ item: { data: undefined, isError: true, refetch }, context: null })

    renderRoute('h1')

    expect(screen.getByText("We couldn't load this Handout.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('says it could not load the Item on the Add Handout page', () => {
    mockUseItemHandoutContext.mockReturnValue({ item: { data: undefined, isError: true, refetch }, context: null })

    renderRoute()

    expect(screen.getByText("We couldn't load this Item.")).toBeInTheDocument()
  })
})
