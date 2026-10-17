import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RichTextLinkDialog } from './rich-text-link-dialog'

// specs/scenario-preparation/ux.md section 15; SP-UX-19, SP-A11Y-15.
function renderDialog(editingUrl: string | null = null) {
  const handlers = { onSave: vi.fn(), onRemove: vi.fn(), onClose: vi.fn(), onCloseFocus: vi.fn() }
  const view = render(<RichTextLinkDialog open editingUrl={editingUrl} {...handlers} />)
  return { ...handlers, ...view }
}

describe('RichTextLinkDialog', () => {
  it('adds a link: titled Add link, field focused, no Remove link', async () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Add link' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Web address' })).toHaveFocus())
    expect(screen.queryByRole('button', { name: 'Remove link' })).not.toBeInTheDocument()
  })

  it('saves a trimmed http or https address', async () => {
    const { onSave } = renderDialog()

    await userEvent.type(screen.getByRole('textbox', { name: 'Web address' }), '  https://example.com/a  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }))

    expect(onSave).toHaveBeenCalledWith('https://example.com/a')
  })

  it.each(['javascript:alert(1)', 'mailto:a@example.com', 'example.com', '/relative', ''])(
    'refuses %j with the message and keeps focus on the field',
    async (address) => {
      const { onSave } = renderDialog()
      const field = screen.getByRole('textbox', { name: 'Web address' })

      if (address) {
        await userEvent.type(field, address)
      }
      await userEvent.click(screen.getByRole('button', { name: 'Save link' }))

      expect(onSave).not.toHaveBeenCalled()
      expect(screen.getByText('Enter a web address that starts with http:// or https://.')).toBeInTheDocument()
      expect(field).toHaveAttribute('aria-invalid', 'true')
      expect(field).toHaveAccessibleDescription('Enter a web address that starts with http:// or https://.')
      expect(field).toHaveFocus()
    },
  )

  it('edits a link: titled Edit link, prefilled, with Remove link', async () => {
    const { onRemove } = renderDialog('https://example.com/a')

    expect(screen.getByRole('dialog', { name: 'Edit link' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Web address' })).toHaveValue('https://example.com/a')

    await userEvent.click(screen.getByRole('button', { name: 'Remove link' }))

    expect(onRemove).toHaveBeenCalled()
  })

  it('closes with Cancel and hands focus back through onCloseFocus once closed', async () => {
    const { onClose, onCloseFocus, rerender, onSave, onRemove } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()

    rerender(<RichTextLinkDialog open={false} editingUrl={null} onSave={onSave} onRemove={onRemove} onClose={onClose} onCloseFocus={onCloseFocus} />)

    await waitFor(() => expect(onCloseFocus).toHaveBeenCalled())
  })

  it('closes with Escape', async () => {
    const { onClose } = renderDialog()

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
