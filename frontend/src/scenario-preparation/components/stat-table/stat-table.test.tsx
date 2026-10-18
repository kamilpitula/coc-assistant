import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatTable } from './stat-table'

// specs/scenario-preparation/ux.md section 25.1; SP-A11Y-26.

describe('StatTable', () => {
  const rows = [
    ['Spot Hidden', '55', 'Hard'],
    ['Listen', '20', 'Regular'],
  ]

  it('is a table with column headings from 640px', () => {
    render(<StatTable label="Skills" columns={['Skill', 'Value', 'Investigator difficulty']} rows={rows} />)

    const table = screen.getByRole('table', { name: 'Skills' })
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Skill', 'Value', 'Investigator difficulty'])
    expect(within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual(rows)
  })

  it('reflows to a definition list per row below 640px', () => {
    render(<StatTable label="Skills" columns={['Skill', 'Value', 'Investigator difficulty']} rows={rows} />)

    const list = screen.getByRole('list', { name: 'Skills' })
    const first = within(list).getAllByRole('listitem')[0]
    expect(first).toHaveTextContent('SkillSpot HiddenValue55Investigator difficultyHard')
    expect(first.querySelectorAll('dt')).toHaveLength(3)
  })
})
