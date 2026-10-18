import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FormErrorSummary } from './form-error-summary'

// specs/scenario-preparation/ux.md section 25.2; SP-UX-35, SP-A11Y-20.

describe('FormErrorSummary', () => {
  it('says "There is 1 problem" for one and "There are n problems" for more, as an alert', () => {
    const { rerender } = render(<FormErrorSummary problems={[{ message: 'Enter a name.', path: 'name' }]} onSelect={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('There is 1 problem')

    rerender(
      <FormErrorSummary
        problems={[
          { message: 'Enter a name.', path: 'name' },
          { message: 'Enter an age.', path: 'age' },
        ]}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'There are 2 problems' })).toBeInTheDocument()
  })

  it('links each problem to its field and reports the path on activation', async () => {
    const onSelect = vi.fn()
    render(<FormErrorSummary problems={[{ message: 'Enter the damage.', path: 'combat.weapons[0].damage' }]} onSelect={onSelect} />)

    const link = screen.getByRole('link', { name: 'Enter the damage.' })
    expect(link).toHaveAttribute('href', '#field-combat-weapons-0-damage')
    await userEvent.click(link)
    expect(onSelect).toHaveBeenCalledWith('combat.weapons[0].damage')
  })

  it('lists a problem without a field as plain text', () => {
    render(<FormErrorSummary problems={[{ message: 'Add at most 100 skills.', path: null }]} onSelect={vi.fn()} />)

    expect(screen.getByText('Add at most 100 skills.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('can take focus', () => {
    render(<FormErrorSummary problems={[{ message: 'x', path: null }]} onSelect={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveAttribute('tabindex', '-1')
  })
})
