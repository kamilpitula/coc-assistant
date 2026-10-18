import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { stateFromMythosCreature } from '@/scenario-preparation/services/mythosCreatureForm'
import { bareMythosCreature, ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterCombatFields } from './monster-combat-fields'

// specs/scenario-preparation/ux.md section 25.5 (Combat); SP-UX-34, SP-UX-47, SP-A11Y-27, SP-A11Y-29.

const noErrors = () => undefined

describe('MonsterCombatFields', () => {
  it('shows attacks per round, Dodge, the damage hint, and each attack as a named group', () => {
    render(<MonsterCombatFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(screen.getByLabelText('Attacks per round')).toHaveValue(3)
    expect(screen.getByLabelText('Dodge')).toHaveValue(30)
    expect(screen.getByText('Damage uses dice like 1D6+DB or 2D6-1. Write DB only where Damage Bonus applies; firearms never add it.')).toBeInTheDocument()
    const claw = screen.getByRole('group', { name: 'Attack 1' })
    expect(within(claw).getByLabelText('Name')).toHaveValue('Claw')
    expect(within(claw).getByLabelText('Skill')).toHaveValue('Fighting')
    expect(within(claw).getByLabelText('Value')).toHaveValue(40)
    expect(within(claw).getByLabelText('Damage')).toHaveValue('1D6+DB')
    expect(within(claw).getByRole('button', { name: 'Remove attack Claw' })).toBeInTheDocument()
  })

  it('opens More details by itself when the attack has an effect or is a manoeuvre, and not otherwise (SP-UX-47)', () => {
    const plain = { ...ghoulMythosCreature.combat!.attacks[0], effect: null, manoeuvre: false }
    render(
      <MonsterCombatFields
        state={stateFromMythosCreature({ ...ghoulMythosCreature, combat: { ...ghoulMythosCreature.combat!, attacks: [plain, ghoulMythosCreature.combat!.attacks[0], ghoulMythosCreature.combat!.attacks[1]] } })}
        dispatch={vi.fn()}
        errorOf={noErrors}
      />,
    )

    const triggers = screen.getAllByRole('button', { name: /^More details for/ })
    expect(triggers.map((trigger) => trigger.getAttribute('aria-expanded'))).toEqual(['false', 'true', 'true'])
    expect(within(screen.getByRole('group', { name: 'Attack 3' })).getByRole('checkbox', { name: 'Manoeuvre (no damage needed)' })).toBeChecked()
  })

  it('opens More details by itself when a server problem sits on the effect so its summary link reaches a visible field (SP-UX-47)', () => {
    const plain = { ...ghoulMythosCreature.combat!.attacks[0], effect: null, manoeuvre: false }
    render(
      <MonsterCombatFields
        state={stateFromMythosCreature({ ...ghoulMythosCreature, combat: { ...ghoulMythosCreature.combat!, attacks: [plain] } })}
        dispatch={vi.fn()}
        errorOf={(path) => (path === 'combat.attacks[0].effect' ? 'Effect must be 1,000 characters or fewer.' : undefined)}
      />,
    )

    expect(screen.getByRole('button', { name: 'More details for Claw' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Effect')).toHaveAttribute('aria-invalid', 'true')
  })

  it('lets the Keeper open and close More details by hand', async () => {
    const plain = { ...ghoulMythosCreature.combat!.attacks[0], effect: null, manoeuvre: false }
    render(
      <MonsterCombatFields
        state={stateFromMythosCreature({ ...ghoulMythosCreature, combat: { ...ghoulMythosCreature.combat!, attacks: [plain] } })}
        dispatch={vi.fn()}
        errorOf={noErrors}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'More details for Claw' })

    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('dispatches edits, add, remove, effect, and Manoeuvre', async () => {
    const dispatch = vi.fn()
    render(<MonsterCombatFields state={stateFromMythosCreature(ghoulMythosCreature)} dispatch={dispatch} errorOf={noErrors} />)
    const claw = screen.getByRole('group', { name: 'Attack 1' })

    await userEvent.type(screen.getByLabelText('Dodge'), '1')
    await userEvent.type(screen.getByLabelText('Attacks per round'), '1')
    await userEvent.type(within(claw).getByLabelText('Name'), 'x')
    await userEvent.type(within(claw).getByLabelText('Value'), '5')
    await userEvent.type(within(claw).getByLabelText('Effect'), 'y')
    await userEvent.click(within(claw).getByRole('checkbox', { name: 'Manoeuvre (no damage needed)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add attack' }))
    await userEvent.click(within(claw).getByRole('button', { name: 'Remove attack Claw' }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'setDodge', value: 301 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setAttacksPerRound', value: 31 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setAttackText', index: 0, field: 'name', value: 'Clawx' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setAttackValue', index: 0, value: 405 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setAttackText', index: 0, field: 'effect', value: 'Grapples on a hit.y' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setAttackManoeuvre', index: 0, value: true })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addAttack' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeAttack', index: 0 })
  })

  it('names an unnamed attack by number', () => {
    const unnamed = { ...ghoulMythosCreature.combat!.attacks[0], name: null }
    render(
      <MonsterCombatFields
        state={stateFromMythosCreature({ ...ghoulMythosCreature, combat: { ...ghoulMythosCreature.combat!, attacks: [unnamed] } })}
        dispatch={vi.fn()}
        errorOf={noErrors}
      />,
    )

    expect(screen.getByRole('button', { name: 'Remove attack 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More details for attack 1' })).toBeInTheDocument()
  })

  it('renders nothing while the section is not added', () => {
    const { container } = render(<MonsterCombatFields state={stateFromMythosCreature(bareMythosCreature)} dispatch={vi.fn()} errorOf={noErrors} />)

    expect(container).toBeEmptyDOMElement()
  })
})
