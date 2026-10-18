import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { stateFromMythosCreature } from '@/scenario-preparation/services/mythosCreatureForm'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterMovementRows } from './monster-movement-rows'

// specs/scenario-preparation/ux.md section 25.5 (Movement); SP-UX-34, SP-A11Y-29.

describe('MonsterMovementRows', () => {
  it('shows each mode as a group named "Movement mode n" and the mode name only for Other', () => {
    render(<MonsterMovementRows state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={() => undefined} />)

    const walk = screen.getByRole('group', { name: 'Movement mode 1' })
    expect(within(walk).getByLabelText('Mode')).toHaveTextContent('Walk')
    expect(within(walk).getByLabelText('Rate')).toHaveValue(8)
    expect(within(walk).queryByLabelText('Name of the mode')).not.toBeInTheDocument()
    const other = screen.getByRole('group', { name: 'Movement mode 2' })
    expect(within(other).getByLabelText('Name of the mode')).toHaveValue('phasing')
    expect(screen.getByText('Enter each way it moves, from 0 to 999. With no modes it has no ordinary movement.')).toBeInTheDocument()
  })

  it('labels Remove with the mode, "Other (name)", or the row number', () => {
    const creature = {
      ...ghoulMythosCreature,
      movement: [
        { mode: 'Fly' as const, label: null, rate: 9 },
        { mode: 'Other' as const, label: 'phasing', rate: 10 },
        { mode: 'Other' as const, label: null, rate: 1 },
      ],
    }
    render(<MonsterMovementRows state={stateFromMythosCreature(creature)} dispatch={vi.fn()} errorOf={() => undefined} />)

    expect(screen.getAllByRole('button', { name: /^Remove movement mode/ }).map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove movement mode Fly',
      'Remove movement mode Other (phasing)',
      'Remove movement mode 3',
    ])
  })

  it('dispatches add, rate edit, and remove', async () => {
    const dispatch = vi.fn()
    render(<MonsterMovementRows state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={dispatch} errorOf={() => undefined} />)

    await userEvent.type(within(screen.getByRole('group', { name: 'Movement mode 1' })).getByLabelText('Rate'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Add movement mode' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove movement mode Walk' }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'setMovementRate', index: 0, value: 81 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addMovement' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeMovement', index: 0 })
  })

  it('changes the mode from the list', async () => {
    const dispatch = vi.fn()
    render(<MonsterMovementRows state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={dispatch} errorOf={() => undefined} />)

    await userEvent.click(within(screen.getByRole('group', { name: 'Movement mode 1' })).getByLabelText('Mode'))
    await userEvent.click(await screen.findByRole('option', { name: 'Burrow' }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'setMovementMode', index: 0, mode: 'Burrow' })
  })

  it('shows the server messages next to the fields', () => {
    render(
      <MonsterMovementRows
        state={stateFromMythosCreature(ghoulMythosCreature)}
        dispatch={vi.fn()}
        errorOf={(path) => ({ 'movement[1].label': 'Name the mode.', 'movement[0].rate': 'Enter a rate from 0 to 999.' })[path]}
      />,
    )

    expect(screen.getByLabelText('Name of the mode')).toHaveAttribute('aria-invalid', 'true')
    expect(within(screen.getByRole('group', { name: 'Movement mode 1' })).getByLabelText('Rate')).toHaveAttribute('aria-invalid', 'true')
  })
})
