import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PointsLeftCounter } from './points-left-counter'

/** specs/character-sheet/ux.md sections 6.5 and 6.6; A11Y-6 (an overrun is shown with an icon and text). */
describe('PointsLeftCounter', () => {
  it('shows the points left of the budget', () => {
    render(<PointsLeftCounter label="Occupation points" budget={280} spent={160} />)

    expect(screen.getByText('Occupation points left: 120 of 280')).toBeInTheDocument()
  })

  it('says how far over budget, in text', () => {
    render(<PointsLeftCounter label="Occupation points" budget={280} spent={320} />)

    expect(screen.getByText('40 over budget')).toBeInTheDocument()
  })

  it('shows nothing until there is a budget', () => {
    const { container } = render(<PointsLeftCounter label="Occupation points" budget={null} spent={0} />)

    expect(container).toBeEmptyDOMElement()
  })
})
