import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SkillAllocationTable } from './skill-allocation-table'

/** specs/character-sheet/ux.md sections 6.5 and 6.6 (skill-allocation-table). */
describe('SkillAllocationTable', () => {
  it('lists each skill with its base, the Player control, and the total', () => {
    render(
      <SkillAllocationTable
        caption="Occupation skills"
        controlHeading="Points"
        rows={[
          { key: 'cr', name: 'Credit Rating', hint: 'Must be between 30 and 70', base: 0, total: 30, control: <input aria-label="Credit Rating, points" /> },
          { key: 'lib', name: 'Library Use', base: 20, total: null, control: <input aria-label="Library Use, points" /> },
        ]}
      />,
    )

    const table = screen.getByRole('table', { name: 'Occupation skills' })
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Skill', 'Base', 'Points', 'Total'])
    const creditRating = within(table).getByRole('row', { name: /Credit Rating/ })
    expect(creditRating).toHaveTextContent('Must be between 30 and 70')
    expect(within(creditRating).getByRole('textbox', { name: 'Credit Rating, points' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: /Library Use/ })).toHaveTextContent('Library Use20')
  })
})
