import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'

import { NonPlayerEntitySummarySection } from './non-player-entity-summary-section'

// specs/scenario-preparation/ux.md section 22; SP-UX-28.

const { mockUseList, refetch } = vi.hoisted(() => ({ mockUseList: vi.fn(), refetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({ useNonPlayerEntities: mockUseList }))

const human = (id: string): NonPlayerEntitySummary => ({ id, type: 'HumanNpc', name: `Human ${id}` })
const creature = (id: string): NonPlayerEntitySummary => ({ id, type: 'MythosCreature', name: `Creature ${id}` })

function show(items: NonPlayerEntitySummary[] | undefined, overrides: Record<string, unknown> = {}) {
  mockUseList.mockReturnValue({ data: items, isPending: false, isError: false, refetch, ...overrides })
}

describe('NonPlayerEntitySummarySection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a section labelled by its heading with the counts, "View all", and Create (SP-UX-28)', () => {
    show([human('1'), human('2'), creature('3')])

    render(<NonPlayerEntitySummarySection campaignId="c1" />)

    const section = screen.getByRole('region', { name: 'Non-Player Entities' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Non-Player Entities' })).toBeInTheDocument()
    expect(within(section).getByText('2 Human NPCs and 1 Mythos Creature.')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'View all Non-Player Entities' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities')
    expect(within(section).getByRole('link', { name: 'Create Non-Player Entity' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities/new')
  })

  it('uses singular forms and leaves out a zero count', () => {
    show([human('1')])

    render(<NonPlayerEntitySummarySection campaignId="c1" />)

    expect(screen.getByText('1 Human NPC.')).toBeInTheDocument()
  })

  it('says there are none and still offers Create, without a View all link', () => {
    show([])

    render(<NonPlayerEntitySummarySection campaignId="c1" />)

    expect(screen.getByText('No Non-Player Entities yet.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View all Non-Player Entities' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Non-Player Entity' })).toBeInTheDocument()
  })

  it('shows a busy skeleton while loading', () => {
    show(undefined, { isPending: true })

    const { container } = render(<NonPlayerEntitySummarySection campaignId="c1" />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('explains a failed load and retries', async () => {
    show(undefined, { isError: true })

    render(<NonPlayerEntitySummarySection campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Non-Player Entities.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })
})
