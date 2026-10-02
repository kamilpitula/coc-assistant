import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CreationMethodsFieldset } from './creation-methods-fieldset'
import { formatCreationMethods } from './creationMethodLabels'

describe('formatCreationMethods', () => {
  it('lists the methods with their short labels in canonical order', () => {
    expect(formatCreationMethods(['QuickFire', 'StandardRolling', 'PointBuy'])).toBe(
      'Standard rolling, Point buy, Quick fire',
    )
  })
})

describe('CreationMethodsFieldset', () => {
  it('groups three labelled checkboxes under the "Allowed creation methods" legend (specs/character-sheet/ux.md section 2)', () => {
    render(<CreationMethodsFieldset value={['StandardRolling', 'QuickFire']} onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Allowed creation methods' })).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Standard rolling - Players roll dice at the table' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Point buy - Players spend a fixed pool of points' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Quick fire - Players assign a fixed set of values' }),
    ).toBeChecked()
  })

  it('reports the new set in canonical order when a method is checked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<CreationMethodsFieldset value={['QuickFire']} onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: /^point buy/i }))

    expect(onChange).toHaveBeenCalledWith(['PointBuy', 'QuickFire'])
  })

  it('reports the remaining methods when a method is unchecked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<CreationMethodsFieldset value={['StandardRolling', 'PointBuy']} onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: /^standard rolling/i }))

    expect(onChange).toHaveBeenCalledWith(['PointBuy'])
  })

  it('identifies an error in text and attaches it to every checkbox (A11Y-4)', () => {
    render(
      <CreationMethodsFieldset
        value={[]}
        onChange={vi.fn()}
        error="Choose at least one creation method."
      />,
    )

    const error = screen.getByText('Choose at least one creation method.')
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toHaveAttribute('aria-invalid', 'true')
      expect(checkbox).toHaveAccessibleDescription('Choose at least one creation method.')
    }
    expect(error.closest('[role="alert"]')).not.toBeNull()
  })

  it('exposes the first checkbox through a ref so callers can move focus to it', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<CreationMethodsFieldset value={[]} onChange={vi.fn()} firstCheckboxRef={ref} />)

    expect(ref.current).toBe(screen.getByRole('checkbox', { name: /^standard rolling/i }))
  })
})
