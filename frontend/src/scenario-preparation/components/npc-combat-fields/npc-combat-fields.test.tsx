import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { humanNpcFormReducer, stateFromHumanNpc } from '@/scenario-preparation/services/humanNpcForm'
import { gangsterHumanNpc, knottHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcCombatFields } from './npc-combat-fields'

// specs/scenario-preparation/ux.md section 25.4; SP-UX-34, SP-UX-43, SP-UX-44, SP-A11Y-27.

function show(overrides: Partial<React.ComponentProps<typeof NpcCombatFields>> = {}) {
  const props = { state: stateFromHumanNpc(gangsterHumanNpc), dispatch: vi.fn(), errorOf: () => undefined, ...overrides }
  render(<NpcCombatFields {...props} />)
  return props
}

describe('NpcCombatFields', () => {
  it('shows Dodge, Armor points, Tactics and morale, and a Weapons fieldset with its hint', () => {
    show()

    expect(screen.getByLabelText('Dodge')).toHaveValue(40)
    expect(screen.getByLabelText('Armor points')).toHaveValue(1)
    expect(screen.getByLabelText('Tactics and morale')).toHaveValue('Flees at half Hit Points.')
    expect(screen.getByRole('group', { name: 'Weapons' })).toBeInTheDocument()
    expect(screen.getByText("Damage uses dice like 1D6+DB or 2D6-1. Firearms don't add DB.")).toBeInTheDocument()
  })

  it('shows each weapon as a group named "Weapon n" with its fields and a named Remove button (SP-A11Y-27)', () => {
    show()

    const first = screen.getByRole('group', { name: 'Weapon 1' })
    expect(within(first).getByLabelText('Name')).toHaveValue('Revolver')
    expect(within(first).getByLabelText('Damage')).toHaveValue('1D10')
    expect(within(first).getByLabelText('Attacks per round')).toHaveValue(1)
    expect(within(first).getByRole('button', { name: 'Remove weapon Revolver' })).toBeInTheDocument()
  })

  it('offers the profile\'s own skill rows, including unsaved ones, as the weapon Skill options (SP-UX-44)', async () => {
    const withUnsaved = humanNpcFormReducer(stateFromHumanNpc(gangsterHumanNpc), { type: 'addSkill' })
    const named = humanNpcFormReducer(withUnsaved, { type: 'setSkillText', index: 3, field: 'name', value: 'Throw' })
    show({ state: named })

    await userEvent.click(within(screen.getByRole('group', { name: 'Weapon 1' })).getByRole('combobox', { name: 'Skill' }))

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Spot Hidden',
      'Firearms (Handgun)',
      'Fighting (Brawl)',
      'Throw',
    ])
  })

  it('selects the weapon\'s current skill and dispatches a different choice', async () => {
    const props = show()
    const select = within(screen.getByRole('group', { name: 'Weapon 1' })).getByRole('combobox', { name: 'Skill' })

    expect(select).toHaveTextContent('Firearms (Handgun)')
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Fighting (Brawl)' }))

    expect(props.dispatch).toHaveBeenCalledWith({ type: 'setWeaponSkill', index: 0, skillKey: 2 })
  })

  it('asks for the skill under Skills first when the profile has none', () => {
    const state = stateFromHumanNpc({ ...knottHumanNpc, combat: { dodge: null, dodgeDifficulty: null, armorPoints: null, tacticsAndMorale: null, weapons: [{ ...gangsterHumanNpc.combat!.weapons[0], skill: null }] } })
    show({ state })

    expect(screen.getByText('Add the skill under Skills first.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('keeps "More details" open when a weapon has details and collapsed when it has none (SP-UX-43)', () => {
    const state = stateFromHumanNpc(gangsterHumanNpc)
    show({ state })

    const revolver = screen.getByRole('button', { name: 'More details for Revolver' })
    const fists = screen.getByRole('button', { name: 'More details for Fists' })
    expect(revolver).toHaveAttribute('aria-expanded', 'true')
    expect(fists).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByLabelText('Range')).toHaveValue('15 yards')
    expect(screen.getByLabelText('Impaling weapon')).toBeChecked()
  })

  it('opens "More details" by itself when the server refused a detail, so the error link has a visible field (SP-UX-43)', () => {
    show({ errorOf: (path) => (path === 'combat.weapons[1].malfunction' ? 'Malfunction must be 1,000 characters or fewer.' : undefined) })

    expect(screen.getByRole('button', { name: 'More details for Fists' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Malfunction must be 1,000 characters or fewer.')).toBeInTheDocument()
  })

  it('lets the Keeper open the details and set Impaling', async () => {
    const props = show()

    await userEvent.click(screen.getByRole('button', { name: 'More details for Fists' }))
    await userEvent.click(screen.getAllByLabelText('Impaling weapon')[1])

    expect(props.dispatch).toHaveBeenCalledWith({ type: 'setWeaponImpaling', index: 1, value: true })
  })

  it('dispatches combat field edits, weapon add, and weapon remove', async () => {
    const { dispatch } = show()

    await userEvent.type(screen.getByLabelText('Dodge'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Add weapon' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove weapon Fists' }))

    expect(dispatch).toHaveBeenCalledWith({ type: 'setDodge', value: 405 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'addWeapon' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'removeWeapon', index: 1 })
  })

  it('shows server messages next to Dodge and the weapon damage', () => {
    show({
      errorOf: (path) =>
        ({ 'combat.dodge': 'Enter Dodge from 0 to 100.', 'combat.weapons[0].damage': 'Enter the damage.' })[path],
    })

    expect(screen.getByLabelText('Dodge')).toHaveAccessibleDescription('Enter Dodge from 0 to 100.')
    expect(screen.getAllByLabelText('Damage')[0]).toHaveAccessibleDescription('Enter the damage.')
  })
})
