import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NpcSpellsView } from './npc-spells-view'

// specs/scenario-preparation/ux.md section 25.4.

describe('NpcSpellsView', () => {
  it('lists each spell with its name, Magic Point cost in muted text, and effect', () => {
    render(<NpcSpellsView spells={[{ name: 'Contact Deity', magicPointCost: '5', effect: 'Summons a god.' }]} />)

    const item = within(screen.getByRole('list')).getByRole('listitem')
    expect(item).toHaveTextContent('Contact Deity')
    expect(item).toHaveTextContent('Magic Point cost 5')
    expect(item).toHaveTextContent('Summons a god.')
  })

  it('leaves out a cost or effect that was not entered', () => {
    render(<NpcSpellsView spells={[{ name: 'Mesmerize', magicPointCost: null, effect: null }]} />)

    expect(screen.queryByText(/Magic Point cost/)).not.toBeInTheDocument()
  })

  it('says "None recorded." for an added section with no spells', () => {
    render(<NpcSpellsView spells={[]} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })
})
