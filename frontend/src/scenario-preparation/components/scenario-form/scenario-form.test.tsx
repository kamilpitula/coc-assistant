import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ScenarioForm } from './scenario-form'

// specs/scenario-preparation/ux.md section 4; SP-UX-5, SP-UX-7, SP-A11Y-2, SP-A11Y-3.

const baseProps = {
  initialValues: { title: '', keeperNotes: '' },
  submitLabel: 'Create Scenario',
  busyLabel: 'Creating...',
  pending: false,
  cancel: <a href="/campaigns/c1">Cancel</a>,
}

describe('ScenarioForm', () => {
  it('labels both fields, marks the notes optional, and connects the notes hint', () => {
    render(<ScenarioForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    const notes = screen.getByLabelText('Keeper notes (optional)')
    expect(notes).toHaveAccessibleDescription('Only you can read these. Up to 10,000 characters.')
    expect(notes).toHaveAttribute('rows', '8')
  })

  it('sets no maxLength so an over-long paste stays visible and is explained', () => {
    render(<ScenarioForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).not.toHaveAttribute('maxlength')
    expect(screen.getByLabelText('Keeper notes (optional)')).not.toHaveAttribute('maxlength')
  })

  it('shows the prefilled values', () => {
    render(<ScenarioForm {...baseProps} initialValues={{ title: 'The Haunting', keeperNotes: 'Cellar key.' }} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toHaveValue('The Haunting')
    expect(screen.getByLabelText('Keeper notes (optional)')).toHaveValue('Cellar key.')
  })

  it('submits the trimmed values', async () => {
    const onSubmit = vi.fn()
    render(<ScenarioForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Title'), '  The Haunting ')
    await userEvent.type(screen.getByLabelText('Keeper notes (optional)'), ' Cellar key. ')
    await userEvent.click(screen.getByRole('button', { name: 'Create Scenario' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: 'The Haunting', keeperNotes: 'Cellar key.' })
  })

  it('explains an empty title next to the field, marks it invalid, focuses it, and saves nothing', async () => {
    const onSubmit = vi.fn()
    render(<ScenarioForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create Scenario' }))

    const title = screen.getByLabelText('Title')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAccessibleDescription('Enter a title.')
    expect(title).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('explains a title over 200 characters and notes over 10,000, focusing the first invalid field', async () => {
    render(<ScenarioForm {...baseProps} onSubmit={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('Title'))
    await userEvent.paste('a'.repeat(201))
    await userEvent.click(screen.getByLabelText('Keeper notes (optional)'))
    await userEvent.paste('n'.repeat(10_001))
    await userEvent.click(screen.getByRole('button', { name: 'Create Scenario' }))

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Title must be 200 characters or fewer.')
    expect(screen.getByLabelText('Keeper notes (optional)')).toHaveAccessibleDescription(
      'Only you can read these. Up to 10,000 characters. Keeper notes must be 10,000 characters or fewer.',
    )
    expect(screen.getByLabelText('Keeper notes (optional)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('focuses the Keeper notes when only they are invalid', async () => {
    render(<ScenarioForm {...baseProps} initialValues={{ title: 'T', keeperNotes: '' }} onSubmit={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('Keeper notes (optional)'))
    await userEvent.paste('n'.repeat(10_001))
    await userEvent.click(screen.getByRole('button', { name: 'Create Scenario' }))

    expect(screen.getByLabelText('Keeper notes (optional)')).toHaveFocus()
  })

  it('shows the server field errors next to their fields and focuses the first', () => {
    render(<ScenarioForm {...baseProps} serverErrors={{ title: 'Enter a title.' }} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title.')
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('disables the submit button and says what it is doing while saving (SP-UX-7)', () => {
    render(<ScenarioForm {...baseProps} pending onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('announces a failure and keeps what was typed', async () => {
    const { rerender } = render(<ScenarioForm {...baseProps} onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Title'), 'The Haunting')

    rerender(<ScenarioForm {...baseProps} failureMessage="We couldn't create the Scenario. Try again." onSubmit={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create the Scenario. Try again.")
    expect(screen.getByLabelText('Title')).toHaveValue('The Haunting')
  })

  it('shows the cancel control it is given', () => {
    render(<ScenarioForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1')
  })

  it('warns before leaving only while there are unsaved edits', async () => {
    render(<ScenarioForm {...baseProps} onSubmit={vi.fn()} />)
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    await userEvent.type(screen.getByLabelText('Title'), 'x')

    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })
})
