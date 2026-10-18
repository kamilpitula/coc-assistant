import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { stateFromMythosCreature } from '@/scenario-preparation/services/mythosCreatureForm'
import { bareMythosCreature, ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterDefensesFields } from './monster-defenses-fields'

// specs/scenario-preparation/ux.md section 25.5 (Defenses); SP-UX-34, SP-A11Y-29.

const noErrors = () => undefined

describe('MonsterDefensesFields', () => {
  it('shows armor points, the armor note, and the immunity and vulnerability rows as named groups', () => {
    render(<MonsterDefensesFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(screen.getByLabelText('Armor points')).toHaveValue(0)
    expect(screen.getByLabelText('Armor note')).toHaveValue('')
    expect(screen.getByText('Say what it covers and when, for example: Ordinary bullets inflict no damage.')).toBeInTheDocument()
    const immunity = screen.getByRole('group', { name: 'Immunity 1' })
    expect(within(immunity).getByLabelText('Description')).toHaveValue('Ordinary bullets inflict no damage.')
    expect(within(screen.getByRole('group', { name: 'Vulnerability 1' })).getByLabelText('Description')).toHaveValue('Fire')
    expect(screen.getByRole('group', { name: 'Immunities' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Vulnerabilities' })).toBeInTheDocument()
  })

  it('dispatches armor edits, adding and removing entries in each list', async () => {
    const dispatch = vi.fn()
    render(<MonsterDefensesFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={dispatch} errorOf={noErrors} />)

    await userEvent.type(screen.getByLabelText('Armor points'), '2')
    await userEvent.type(screen.getByLabelText('Armor note'), 'H')
    await userEvent.click(screen.getByRole('button', { name: 'Add immunity' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add vulnerability' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove immunity 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove vulnerability 1' }))
    await userEvent.type(within(screen.getByRole('group', { name: 'Vulnerability 1' })).getByLabelText('Description'), '!')

    expect(dispatch).toHaveBeenCalledWith({ type: 'setArmorPoints', value: 2 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setArmorNote', value: 'H' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addDefenseEntry', list: 'immunities' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addDefenseEntry', list: 'vulnerabilities' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeDefenseEntry', list: 'immunities', index: 0 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeDefenseEntry', list: 'vulnerabilities', index: 0 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setDefenseEntry', list: 'vulnerabilities', index: 0, value: 'Fire!' })
  })

  it('shows the server messages next to the fields', () => {
    render(
      <MonsterDefensesFields
        state={stateFromMythosCreature(ghoulMythosCreature)}
        dispatch={vi.fn()}
        errorOf={(path) => ({ 'defenses.armorPoints': 'Enter armor points from 0 to 2,000.', 'defenses.immunities[0].description': 'Describe the immunity.' })[path]}
      />,
    )

    expect(screen.getByLabelText('Armor points')).toHaveAttribute('aria-invalid', 'true')
    expect(within(screen.getByRole('group', { name: 'Immunity 1' })).getByLabelText('Description')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders nothing while the section is not added', () => {
    const { container } = render(<MonsterDefensesFields state={stateFromMythosCreature(bareMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(container).toBeEmptyDOMElement()
  })
})
