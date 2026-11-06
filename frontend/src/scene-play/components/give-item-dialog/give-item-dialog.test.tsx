import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GiveItemDialog } from './give-item-dialog'

// specs/scene-play/ux.md section 22.3; SPL-UX-52, SPL-A11Y-19.
const investigators = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]

const baseProps = {
  open: true,
  itemName: "Walter Corbitt's diary",
  holder: null as { id: string; name: string } | null,
  investigators,
  pending: false,
  refusal: null as string | null,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  onCloseAutoFocus: vi.fn(),
}

describe('GiveItemDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is named "Give {name}", shows the Item badge, and lists who is present as radios with nothing chosen', async () => {
    render(<GiveItemDialog {...baseProps} />)

    expect(screen.getByRole('dialog', { name: "Give Walter Corbitt's diary" })).toBeInTheDocument()
    expect(screen.getByText('Item')).toBeInTheDocument()
    expect(screen.getByText('Give to')).toBeInTheDocument()
    expect(
      screen.getByText("Walter Corbitt's diary becomes theirs, and they receive it as a Clue. Taking it back later doesn't remove the Clue."),
    ).toBeInTheDocument()
    const options = screen.getAllByRole('radio')
    expect(options).toHaveLength(2)
    expect(options.every((option) => option.getAttribute('aria-checked') === 'false')).toBe(true)
    expect(screen.getByRole('radio', { name: 'Harvey Walters' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lucy Ward' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Give' }))
    expect(baseProps.onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Choose an Investigator.')).toBeInTheDocument()
  })

  it('marks the holder "(holds it)" and disables that radio, and names the holder in the hint', () => {
    render(<GiveItemDialog {...baseProps} holder={{ id: 'i1', name: 'Harvey Walters' }} />)

    expect(screen.getByRole('radio', { name: 'Harvey Walters (holds it)' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Lucy Ward' })).toBeEnabled()
    expect(screen.getByText(/Harvey Walters holds it now and keeps the Clue\./)).toBeInTheDocument()
  })

  it('puts focus on the first enabled radio when nothing is chosen', async () => {
    render(<GiveItemDialog {...baseProps} holder={{ id: 'i1', name: 'Harvey Walters' }} />)

    await userEvent.click(screen.getByRole('button', { name: 'Give' }))

    expect(screen.getByText('Choose an Investigator.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lucy Ward' })).toHaveFocus()
  })

  it('connects the hint and the error to the radio group', async () => {
    render(<GiveItemDialog {...baseProps} />)

    const group = screen.getByRole('radiogroup')
    const hint = screen.getByText(/becomes theirs/)
    expect(group).toHaveAttribute('aria-describedby', hint.id)
    expect(group).toHaveAttribute('aria-invalid', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Give' }))

    const error = screen.getByText('Choose an Investigator.')
    expect(group).toHaveAttribute('aria-describedby', `${hint.id} ${error.id}`)
    expect(group).toHaveAttribute('aria-invalid', 'true')
  })

  it('gives to the chosen Investigator', async () => {
    const onConfirm = vi.fn()
    render(<GiveItemDialog {...baseProps} holder={{ id: 'i1', name: 'Harvey Walters' }} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Lucy Ward' }))
    await userEvent.click(screen.getByRole('button', { name: 'Give' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith('i2')
  })

  it('reads "Giving..." with both buttons disabled, and Escape does not close it', async () => {
    const onCancel = vi.fn()
    render(<GiveItemDialog {...baseProps} pending onCancel={onCancel} />)

    expect(screen.getByRole('button', { name: 'Giving...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('shows a refusal as an alert inside the dialog', () => {
    render(<GiveItemDialog {...baseProps} refusal="That Investigator is no longer present or already holds Walter Corbitt's diary. Check the list and try again." />)

    expect(screen.getByRole('alert')).toHaveTextContent('That Investigator is no longer present')
  })

  it('cancels back to "Give..."', async () => {
    const onCancel = vi.fn()
    render(<GiveItemDialog {...baseProps} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
