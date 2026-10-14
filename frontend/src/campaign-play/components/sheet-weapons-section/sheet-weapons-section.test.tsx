import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { characterSheetFormReducer } from '@/campaign-play/state/characterSheetForm'
import { validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'

import { SheetWeaponsSection } from './sheet-weapons-section'

const revolver = { name: '.38 Revolver', skill: 'Firearms (Handgun)', damage: '1D10', attacks: '1 (3)', range: '15 yards', ammo: '6', malfunction: '100' }

function Editing({ errors = {}, onChange = vi.fn() }: { errors?: Record<string, string>; onChange?: (inputs: CharacterSheetInputs) => void }) {
  const [inputs, dispatch] = useReducer(characterSheetFormReducer, validInputs)
  onChange(inputs)
  return <SheetWeaponsSection weapons={inputs.weapons} editing={{ inputs, errors, onAction: dispatch, onBlur: vi.fn() }} />
}

/** specs/character-sheet/ux.md section 6.7 Weapons and section 7; docs/game-rules project_ruleset.md section 4.2. */
describe('SheetWeaponsSection', () => {
  it('UX-28: lists the Custom Weapons read-only in a table', () => {
    render(<SheetWeaponsSection weapons={[revolver]} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Weapons' })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Weapons' })
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Weapon',
      'Skill',
      'Damage',
      'Attacks',
      'Range',
      'Ammo',
      'Malfunction',
    ])
    expect(within(table).getByRole('row', { name: /\.38 Revolver/ })).toHaveTextContent('Firearms (Handgun)1D101 (3)15 yards6100')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('reads "None recorded." without weapons', () => {
    render(<SheetWeaponsSection weapons={[]} />)

    expect(screen.getByText('None recorded.')).toBeInTheDocument()
  })

  it('UX-27: adds a weapon and focuses its name, edits it, and removes it returning focus to "Add weapon"', async () => {
    let latest = validInputs
    render(<Editing onChange={(inputs) => (latest = inputs)} />)

    expect(screen.getByText('Enter weapon details from your rulebook. Your Keeper checks them when approving.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add weapon' }))

    const weapon = screen.getByRole('group', { name: 'Weapon 1' })
    expect(within(weapon).getByLabelText('Weapon 1 name')).toHaveFocus()
    expect(within(weapon).getAllByRole('textbox')).toHaveLength(7)
    expect(within(weapon).getByLabelText('Weapon 1 name')).toHaveAttribute('maxlength', '100')

    await userEvent.type(within(weapon).getByLabelText('Weapon 1 name'), 'Knife')
    await userEvent.type(within(weapon).getByLabelText('Weapon 1 damage'), '1D4')
    expect(latest.weapons).toEqual([{ name: 'Knife', skill: null, damage: '1D4', attacks: null, range: null, ammo: null, malfunction: null }])

    await userEvent.click(screen.getByRole('button', { name: 'Remove weapon 1' }))
    expect(latest.weapons).toEqual([])
    expect(screen.getByRole('button', { name: 'Add weapon' })).toHaveFocus()
  })

  it('shows a weapon name error inline', async () => {
    render(<Editing errors={{ 'weapons[0].name': 'Enter a name for this weapon.' }} />)

    await userEvent.click(screen.getByRole('button', { name: 'Add weapon' }))

    expect(screen.getByLabelText('Weapon 1 name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Weapon 1 name')).toHaveAccessibleDescription('Enter a name for this weapon.')
  })
})
