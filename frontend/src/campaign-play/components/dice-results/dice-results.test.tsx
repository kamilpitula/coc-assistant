import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DiceResults } from './dice-results'

const rollRecords = [
  { purpose: 'Luck', dice: '3D6', faces: null, result: 11, source: 'PlayerEntered', rolledByDisplayName: 'Ada Lovelace', rolledAt: null },
  { purpose: 'Luck:SecondRoll', dice: '3D6', faces: null, result: 13, source: 'PlayerEntered', rolledByDisplayName: 'Ada Lovelace', rolledAt: null },
  {
    purpose: 'EduImprovement[1].Check',
    dice: 'D100',
    faces: null,
    result: 70,
    source: 'PlayerEntered',
    rolledByDisplayName: 'Ada Lovelace',
    rolledAt: null,
  },
  {
    purpose: 'EduImprovement[1].Gain',
    dice: '1D10',
    faces: null,
    result: 5,
    source: 'PlayerEntered',
    rolledByDisplayName: 'Ada Lovelace',
    rolledAt: null,
  },
]

/** specs/character-sheet/ux.md section 7.1 "Dice results" (UX-34; PBI-DICE-002 scope of section 9). */
describe('DiceResults', () => {
  it('is collapsed by default', () => {
    render(<DiceResults rollRecords={rollRecords} />)

    expect(screen.getByRole('button', { name: 'Dice results' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('UX-34: lists each Roll Record with faces, who rolled, and when', async () => {
    render(<DiceResults rollRecords={rollRecords} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dice results' }))

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Rolled for',
      'Dice',
      'Faces',
      'Result',
      'Rolled by',
      'When',
    ])
    const rows = within(table).getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(rows).toEqual([
      'Luck3D6Not recorded11Ada Lovelace (entered)Not recorded',
      'Luck, second roll3D6Not recorded13Ada Lovelace (entered)Not recorded',
      'EDU check 1D100Not recorded70Ada Lovelace (entered)Not recorded',
      'EDU check 1 gain1D10Not recorded5Ada Lovelace (entered)Not recorded',
    ])
  })

  it('section 2.1: names a Standard rolling roll by its characteristic, with its Server faces and time', async () => {
    render(
      <DiceResults
        rollRecords={[
          {
            purpose: 'Characteristic:SIZ',
            dice: '2D6',
            faces: [2, 5],
            result: 7,
            source: 'Server',
            rolledByDisplayName: 'Ada Lovelace',
            rolledAt: '2026-11-08T14:30:00+00:00',
          },
        ]}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Dice results' }))

    const row = within(screen.getByRole('table')).getAllByRole('row')[1]
    expect(row.textContent).toContain('SIZ2D62, 57Server, for Ada Lovelace')
    const time = row.querySelector('time')
    expect(time?.getAttribute('dateTime')).toBe('2026-11-08T14:30:00+00:00')
  })
})
