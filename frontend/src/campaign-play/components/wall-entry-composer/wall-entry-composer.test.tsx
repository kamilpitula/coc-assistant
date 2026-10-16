import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WallEntryComposer } from './wall-entry-composer'

// specs/campaign-wall/ux.md sections 2 and 4.2; WL-UX-2, WL-UX-3, WL-UX-6, WL-A11Y-2, WL-A11Y-3.

function renderComposer(overrides: Partial<React.ComponentProps<typeof WallEntryComposer>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(true)
  render(<WallEntryComposer viewerRole="Keeper" pending={false} failed={false} onSubmit={onSubmit} {...overrides} />)
  return { onSubmit, textbox: screen.getByRole('textbox', { name: 'New Wall Entry' }) }
}

describe('WallEntryComposer', () => {
  it('offers the Keeper "Who can read this?" with Public selected by default (WL-UX-2, WL-A11Y-3)', () => {
    renderComposer()

    const group = screen.getByRole('radiogroup', { name: 'Who can read this?' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Public/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Keeper only/ })).not.toBeChecked()
    expect(screen.getByText('Players can read this.')).toBeInTheDocument()
    expect(screen.getByText('Only you can read this.')).toBeInTheDocument()
  })

  it('gives a Player no visibility choice, only the help text (WL-UX-3)', () => {
    renderComposer({ viewerRole: 'Player' })

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByText('Everyone in this Campaign can read this.')).toBeInTheDocument()
  })

  it('cannot post empty or whitespace-only text, and says why (WL-UX-6)', async () => {
    const { textbox } = renderComposer()
    const post = screen.getByRole('button', { name: 'Add to the Wall' })

    expect(post).toBeDisabled()
    expect(textbox).toHaveAccessibleDescription(expect.stringContaining('Write something to post.'))

    await userEvent.type(textbox, '   ')

    expect(post).toBeDisabled()
  })

  it('shows the count and blocks text over 2000 characters with an explanation (WL-UX-6, WL-A11Y-2)', () => {
    const { textbox } = renderComposer()

    fireEvent.change(textbox, { target: { value: 'a'.repeat(2001) } })

    expect(screen.getByRole('button', { name: 'Add to the Wall' })).toBeDisabled()
    expect(textbox).toHaveAttribute('aria-invalid', 'true')
    expect(textbox).toHaveAccessibleDescription(expect.stringContaining('Wall Entries can be at most 2000 characters.'))
    expect(textbox).not.toHaveAttribute('maxlength')
  })

  it('counts the characters typed against the limit', async () => {
    const { textbox } = renderComposer()

    await userEvent.type(textbox, 'Door creaks.')

    expect(screen.getByText('12 / 2000')).toBeInTheDocument()
  })

  it('posts the Keeper entry with the chosen visibility, then clears, resets to Public, and keeps focus (WL-UX-2)', async () => {
    const { onSubmit, textbox } = renderComposer()

    await userEvent.type(textbox, '  The butler is the cultist.  ')
    await userEvent.click(screen.getByRole('radio', { name: /Keeper only/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

    expect(onSubmit).toHaveBeenCalledWith({ text: 'The butler is the cultist.', visibility: 'KeeperOnly' })
    await waitFor(() => expect(textbox).toHaveValue(''))
    expect(screen.getByRole('radio', { name: /Public/ })).toBeChecked()
    expect(textbox).toHaveFocus()
  })

  it('posts a Player entry without a visibility, so the server records it as Public (WL-UX-3)', async () => {
    const { onSubmit, textbox } = renderComposer({ viewerRole: 'Player' })

    await userEvent.type(textbox, 'I search the desk.')
    await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

    expect(onSubmit).toHaveBeenCalledWith({ text: 'I search the desk.' })
  })

  it('keeps the text and the chosen visibility when posting fails (WL-UX-6)', async () => {
    const { textbox } = renderComposer({ onSubmit: vi.fn().mockResolvedValue(false), failed: true })

    await userEvent.type(textbox, 'Keep me')
    await userEvent.click(screen.getByRole('radio', { name: /Keeper only/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

    expect(textbox).toHaveValue('Keep me')
    expect(screen.getByRole('radio', { name: /Keeper only/ })).toBeChecked()
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't add your entry. Your text is still here. Try again.")
  })

  it('cannot be submitted again while a post is in flight', async () => {
    const { textbox } = renderComposer({ pending: true })

    await userEvent.type(textbox, 'Something')

    expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()
  })

  it('submits with Ctrl+Enter when posting is allowed', async () => {
    const { onSubmit, textbox } = renderComposer()

    await userEvent.type(textbox, 'Quick entry{Control>}{Enter}{/Control}')

    expect(onSubmit).toHaveBeenCalledWith({ text: 'Quick entry', visibility: 'Public' })
  })
})
