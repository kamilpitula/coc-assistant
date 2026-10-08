import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DiceResults } from './dice-results'

const rollRecords = [
  { purpose: 'Luck', dice: '3D6', result: 11, source: 'PlayerEntered' },
  { purpose: 'Luck:SecondRoll', dice: '3D6', result: 13, source: 'PlayerEntered' },
  { purpose: 'EduImprovement[1].Check', dice: 'D100', result: 70, source: 'PlayerEntered' },
  { purpose: 'EduImprovement[1].Gain', dice: '1D10', result: 5, source: 'PlayerEntered' },
]

/** specs/character-sheet/ux.md section 7.1 "Dice results" (delivered in PBI-CP-003, section 9). */
describe('DiceResults', () => {
  it('is collapsed by default', () => {
    render(<DiceResults rollRecords={rollRecords} />)

    expect(screen.getByRole('button', { name: 'Dice results' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('lists each Roll Record with what it was rolled for, the dice, the result, and who entered it', async () => {
    render(<DiceResults rollRecords={rollRecords} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dice results' }))

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Rolled for',
      'Dice',
      'Result',
      'Entered by',
    ])
    const rows = within(table).getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(rows).toEqual([
      'Luck3D611Player',
      'Luck, second roll3D613Player',
      'EDU check 1D10070Player',
      'EDU check 1 gain1D105Player',
    ])
  })

  it('section 2.1: names a Standard rolling roll by its characteristic', async () => {
    render(<DiceResults rollRecords={[{ purpose: 'Characteristic:SIZ', dice: '2D6', result: 6, source: 'PlayerEntered' }]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dice results' }))

    expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toBe('SIZ2D66Player')
  })
})
