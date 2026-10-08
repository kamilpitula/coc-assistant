import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DiceRollInput } from './dice-roll-input'

/** specs/character-sheet/ux.md section 6.2 dice rows; UX-9 (raw total in, computed value shown) and A11Y-3. */
describe('DiceRollInput', () => {
  it('names the roll and the dice, hints the range, and shows the computed value', () => {
    render(
      <DiceRollInput field="luckRolls[0]" rollLabel="Luck" dice="3D6" multiplier={5} value={11} onChange={vi.fn()} />,
    )

    const input = screen.getByLabelText('Luck, 3D6 total')
    expect(input).toHaveValue(11)
    expect(input).toHaveAccessibleDescription('3 to 18')
    expect(screen.getByText('3D6 x 5')).toBeInTheDocument()
    expect(screen.getByText('= 55')).toBeInTheDocument()
  })

  it('shows no computed value until a total is entered, and attaches errors', () => {
    render(
      <DiceRollInput
        field="luckRolls[0]"
        rollLabel="Luck"
        dice="3D6"
        multiplier={5}
        value={null}
        error="Enter your Luck roll."
        onChange={vi.fn()}
      />,
    )

    expect(screen.queryByText(/^= /)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Luck, 3D6 total')).toHaveAttribute('aria-invalid', 'true')
  })

  it('section 2.1: shows a bonus in the expression and adds it before multiplying', () => {
    render(<DiceRollInput field="characteristicRolls.SIZ" rollLabel="SIZ" dice="2D6" bonus={6} multiplier={5} value={7} onChange={vi.fn()} />)

    expect(screen.getByLabelText('SIZ, 2D6 total')).toHaveAccessibleDescription('2 to 12')
    expect(screen.getByText('(2D6 + 6) x 5')).toBeInTheDocument()
    expect(screen.getByText('= 65')).toBeInTheDocument()
  })
})
