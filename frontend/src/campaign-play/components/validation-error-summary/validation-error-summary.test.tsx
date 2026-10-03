import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ValidationErrorSummary } from './validation-error-summary'

const errors = [
  { field: 'identity.name', message: "Enter your Investigator's name." },
  { field: 'identity.age', message: 'Age must be between 15 and 89.' },
]

/** specs/character-sheet/ux.md section 5.2 error summary; A11Y-4. */
describe('ValidationErrorSummary', () => {
  it('is an alert headed "There\'s a problem" with one link per error', () => {
    render(<ValidationErrorSummary errors={errors} onSelect={vi.fn()} />)

    const summary = screen.getByRole('alert')
    expect(within(summary).getByRole('heading', { name: "There's a problem" })).toBeInTheDocument()
    expect(within(summary).getAllByRole('link')).toHaveLength(2)
  })

  it('reports which field a link points to', async () => {
    const onSelect = vi.fn()
    render(<ValidationErrorSummary errors={errors} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('link', { name: 'Age must be between 15 and 89.' }))

    expect(onSelect).toHaveBeenCalledWith('identity.age')
  })
})
