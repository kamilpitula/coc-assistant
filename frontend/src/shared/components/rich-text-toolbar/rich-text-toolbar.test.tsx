import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EMPTY_TOOLBAR_STATE, type ToolbarState } from '@/shared/services/richTextToolbar'

import { RichTextToolbar } from './rich-text-toolbar'

// specs/scenario-preparation/ux.md section 15; SP-A11Y-13.
const NAMES = [
  'Bold',
  'Italic',
  'Underline',
  'Strikethrough',
  'Heading',
  'Subheading',
  'Quote',
  'Bulleted list',
  'Numbered list',
  'Link',
]

function renderToolbar(state: Partial<ToolbarState> = {}) {
  const onAction = vi.fn()
  render(<RichTextToolbar state={{ ...EMPTY_TOOLBAR_STATE, ...state }} onAction={onAction} />)
  return onAction
}

describe('RichTextToolbar', () => {
  it('is a toolbar named Formatting with a named toggle button for every format and block, in order', () => {
    renderToolbar()

    expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(NAMES)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('shows the pressed state of the selection', () => {
    renderToolbar({ bold: true, 'bulleted-list': true, link: true })

    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('has one tab stop: only the first button is tabbable until the focus moves', async () => {
    renderToolbar()

    const tabbable = screen.getAllByRole('button').filter((button) => button.tabIndex === 0)
    expect(tabbable.map((button) => button.textContent)).toEqual(['Bold'])

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Bold' })).not.toHaveFocus()
  })

  it('moves between buttons with Arrow Right and Left, and to the ends with Home and End', async () => {
    renderToolbar()
    await userEvent.tab()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('tabindex', '-1')

    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus()

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('button', { name: 'Link' })).toHaveFocus()

    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus()
  })

  it('wraps from the first button to the last and back', async () => {
    renderToolbar()
    await userEvent.tab()

    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('button', { name: 'Link' })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveFocus()
  })

  it('reports the pressed button', async () => {
    const onAction = renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: 'Subheading' }))
    await userEvent.click(screen.getByRole('button', { name: 'Link' }))

    expect(onAction.mock.calls.map(([button]) => button)).toEqual(['subheading', 'link'])
  })

  it('keeps the tab stop where the focus was left', async () => {
    renderToolbar()
    await userEvent.click(screen.getByRole('button', { name: 'Quote' }))

    expect(screen.getByRole('button', { name: 'Quote' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('tabindex', '-1')
  })
})
