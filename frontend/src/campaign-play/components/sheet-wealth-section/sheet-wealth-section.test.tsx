import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SheetWealthSection } from './sheet-wealth-section'

/** specs/character-sheet/ux.md section 6.7 Wealth; values come from the server (docs/game-rules section 11). */
describe('SheetWealthSection', () => {
  it('UX-28: shows the spending level, cash, and assets the server computed', () => {
    render(
      <SheetWealthSection
        wealth={{ currency: 'USD', spendingLevel: { amount: 0.5, orMore: false }, cash: { amount: 1500, orMore: false }, assets: { amount: 5000000, orMore: true } }}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Wealth' })).toBeInTheDocument()
    expect(screen.getByText('Spending level').nextElementSibling).toHaveTextContent('$0.50')
    expect(screen.getByText('Cash').nextElementSibling).toHaveTextContent('$1,500')
    expect(screen.getByText('Assets').nextElementSibling).toHaveTextContent('$5,000,000 or more')
  })

  it('reads "None" for no assets', () => {
    render(<SheetWealthSection wealth={{ currency: 'USD', spendingLevel: { amount: 2, orMore: false }, cash: { amount: 10, orMore: false }, assets: null }} />)

    expect(screen.getByText('Assets').nextElementSibling).toHaveTextContent('None')
  })

  it('shows "not yet calculated" before Credit Rating is calculable', () => {
    render(<SheetWealthSection wealth={null} />)

    expect(screen.getAllByText('not yet calculated')).toHaveLength(3)
  })
})
