import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SpellRowFields } from './spell-row-fields'

// specs/scenario-preparation/ux.md sections 25.4, 25.5; SP-A11Y-27, SP-A11Y-29.

const row = { name: 'Contact Deity', magicPointCost: '5', effect: 'Summons a god.' }

describe('SpellRowFields', () => {
  it('names the group by item and number and labels the fields', () => {
    render(<SpellRowFields list="spells" item="Spell" index={0} row={row} errorOf={() => undefined} onTextChange={vi.fn()} onRemove={vi.fn()} />)

    const group = screen.getByRole('group', { name: 'Spell 1' })
    expect(within(group).getByLabelText('Name')).toHaveValue('Contact Deity')
    expect(within(group).getByLabelText('Magic Point cost')).toHaveValue('5')
    expect(within(group).getByLabelText('Effect')).toHaveValue('Summons a god.')
    expect(within(group).queryByLabelText('Limits')).not.toBeInTheDocument()
    expect(within(group).getByRole('button', { name: 'Remove spell Contact Deity' })).toBeInTheDocument()
  })

  it('shows a Limits field only when the row has limits, and reports edits and removal', async () => {
    const onTextChange = vi.fn()
    const onRemove = vi.fn()
    render(
      <SpellRowFields list="powers" item="Power" index={1} row={{ ...row, name: '', limits: '' }} errorOf={() => undefined} onTextChange={onTextChange} onRemove={onRemove} />,
    )

    await userEvent.type(screen.getByLabelText('Limits'), 'L')
    await userEvent.click(screen.getByRole('button', { name: 'Remove power 2' }))

    expect(onTextChange).toHaveBeenCalledWith('limits', 'L')
    expect(onRemove).toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Power 2' })).toBeInTheDocument()
  })

  it('marks the field with the server message invalid', () => {
    render(
      <SpellRowFields
        list="spells"
        item="Spell"
        index={0}
        row={row}
        errorOf={(path) => (path === 'spells[0].name' ? "Enter the spell's name." : undefined)}
        onTextChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
  })
})
