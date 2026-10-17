import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RemoveSectionDialog } from './remove-section-dialog'

// specs/scenario-preparation/ux.md section 25.2; SP-UX-33, SP-A11Y-22.

describe('RemoveSectionDialog', () => {
  it('asks to remove the section, says its values are deleted on save, and starts on "Keep section"', () => {
    render(<RemoveSectionDialog open section="Skills" onKeep={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.getByRole('alertdialog', { name: 'Remove the Skills section?' })).toBeInTheDocument()
    expect(screen.getByText('Its values are deleted when you save.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep section' })).toHaveFocus()
  })

  it('removes on "Remove section" and keeps on "Keep section"', async () => {
    const onKeep = vi.fn()
    const onRemove = vi.fn()
    render(<RemoveSectionDialog open section="Skills" onKeep={onKeep} onRemove={onRemove} />)

    await userEvent.click(screen.getByRole('button', { name: 'Remove section' }))
    expect(onRemove).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Keep section' }))
    expect(onKeep).toHaveBeenCalled()
  })

  it('renders nothing while closed', () => {
    render(<RemoveSectionDialog open={false} section="Skills" onKeep={vi.fn()} onRemove={vi.fn()} />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
