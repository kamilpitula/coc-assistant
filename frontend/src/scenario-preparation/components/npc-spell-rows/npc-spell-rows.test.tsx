import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { stateFromHumanNpc } from '@/scenario-preparation/services/humanNpcForm'
import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcSpellRows } from './npc-spell-rows'

// specs/scenario-preparation/ux.md section 25.4; SP-UX-34, SP-A11Y-27.

describe('NpcSpellRows', () => {
  it('shows each spell as a group named "Spell n" with name, Magic Point cost, effect, and Remove', () => {
    render(<NpcSpellRows state={stateFromHumanNpc(gangsterHumanNpc)} dispatch={vi.fn()} errorOf={() => undefined} />)

    const group = screen.getByRole('group', { name: 'Spell 1' })
    expect(within(group).getByLabelText('Name')).toHaveValue('Contact Deity')
    expect(within(group).getByLabelText('Magic Point cost')).toHaveValue('5')
    expect(within(group).getByLabelText('Effect')).toHaveValue('Summons a god.')
    expect(within(group).getByRole('button', { name: 'Remove spell Contact Deity' })).toBeInTheDocument()
  })

  it('names an unnamed row by number and dispatches add, edit, and remove', async () => {
    const dispatch = vi.fn()
    const state = stateFromHumanNpc({ ...gangsterHumanNpc, spells: [{ name: null, magicPointCost: null, effect: null }] })
    render(<NpcSpellRows state={state} dispatch={dispatch} errorOf={() => undefined} />)

    await userEvent.type(screen.getByLabelText('Name'), 'M')
    await userEvent.click(screen.getByRole('button', { name: 'Add spell' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove spell 1' }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'setSpellText', index: 0, field: 'name', value: 'M' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addSpell' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeSpell', index: 0 })
  })

  it('shows the server message next to the spell name', () => {
    render(
      <NpcSpellRows
        state={stateFromHumanNpc(gangsterHumanNpc)}
        dispatch={vi.fn()}
        errorOf={(path) => (path === 'spells[0].name' ? "Enter the spell's name." : undefined)}
      />,
    )

    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })
})
