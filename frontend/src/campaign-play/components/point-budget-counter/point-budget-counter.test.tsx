import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PointBuyBudgetCounter } from './point-budget-counter'

/** specs/character-sheet/ux.md section 6.2, Point buy budget counter. */
describe('PointBuyBudgetCounter', () => {
  it('reads "Points used: X of Y" from the entered values and the budget', () => {
    render(<PointBuyBudgetCounter values={{ STR: 60, CON: 60, DEX: null, APP: 50 }} budget={460} />)

    expect(screen.getByText('Points used: 170 of 460')).toBeInTheDocument()
  })
})
