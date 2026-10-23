import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ItemScene } from '@/scenario-preparation/types/Item'

import { ItemScenesSection } from './item-scenes-section'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 63.1; SP-UX-96, SP-A11Y-51, SP-A11Y-58.
const corbittHouse: ItemScene = { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status: 'Active' }
const cellar: ItemScene = { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a2', title: 'The cellar', status: 'Prepared' }
const arkham: ItemScene = { scenarioId: 's2', scenarioTitle: 'Edge of Darkness', id: 'a3', title: 'Arkham Library', status: 'Finished' }

describe('ItemScenesSection', () => {
  it('is a section labelled by an h2 "Scenes" (SP-A11Y-51)', () => {
    render(<ItemScenesSection campaignId="c1" scenes={[corbittHouse]} />)

    const section = screen.getByRole('region', { name: 'Scenes' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Scenes' })).toBeInTheDocument()
  })

  it('lists the Scenes in the order given, each linked to its Scene page with its Scenario (SP-UX-96)', () => {
    render(<ItemScenesSection campaignId="c1" scenes={[corbittHouse, cellar, arkham]} />)

    const entries = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(entries.map((entry) => within(entry).getByRole('link').textContent)).toEqual(['The Corbitt House', 'The cellar', 'Arkham Library'])
    expect(within(entries[0]).getByRole('link')).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
    expect(within(entries[2]).getByRole('link')).toHaveAttribute('href', '/campaigns/c1/scenarios/s2/scenes/a3')
    expect(entries[0]).toHaveTextContent('Scenario: The Haunting')
    expect(entries[2]).toHaveTextContent('Scenario: Edge of Darkness')
  })

  it('names each Scene status as text, not by colour alone (SP-UX-96, SP-A11Y-58)', () => {
    render(<ItemScenesSection campaignId="c1" scenes={[corbittHouse, cellar, arkham]} />)

    const entries = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(entries[0]).toHaveTextContent('Active')
    expect(entries[1]).toHaveTextContent('Prepared')
    expect(entries[2]).toHaveTextContent('Finished')
  })

  it('says the Item is not linked yet and offers no link or unlink control here', () => {
    render(<ItemScenesSection campaignId="c1" scenes={[]} />)

    expect(screen.getByText('Not linked to any Scene yet. Link it from a Scene page.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('has no unlink control for a linked Scene either (SP-UX-96)', () => {
    render(<ItemScenesSection campaignId="c1" scenes={[cellar]} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
