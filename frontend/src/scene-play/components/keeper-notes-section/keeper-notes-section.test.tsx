import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { paragraph } from '@/scene-play/test-support/revealFixtures'
import type { RichTextDocument } from '@/shared/types/RichText'

import { KeeperNotesSection } from './keeper-notes-section'

// specs/scene-play/ux.md section 12 (Keeper notes); SPL-UX-25, SPL-A11Y-8, SPL-A11Y-11.
const emptyParagraph: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [] }] } }

describe('KeeperNotesSection', () => {
  it('is a section labelled by its h2 "Keeper notes", with the notes closed', () => {
    render(<KeeperNotesSection notes={paragraph('Walter is in the cellar.')} />)

    expect(screen.getByRole('region', { name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Keeper notes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show Keeper notes' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Walter is in the cellar.')).not.toBeInTheDocument()
  })

  it('shows the notes read-only after "Show Keeper notes" and hides them again', async () => {
    render(<KeeperNotesSection notes={paragraph('Walter is in the cellar.')} />)

    await userEvent.click(screen.getByRole('button', { name: 'Show Keeper notes' }))
    expect(screen.getByText('Walter is in the cellar.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hide Keeper notes' }))
    expect(screen.queryByText('Walter is in the cellar.')).not.toBeInTheDocument()
  })

  it.each([[null], [emptyParagraph]])('says "No Keeper notes." when the Scene has none', async (notes) => {
    render(<KeeperNotesSection notes={notes} />)

    await userEvent.click(screen.getByRole('button', { name: 'Show Keeper notes' }))

    expect(screen.getByText('No Keeper notes.')).toBeInTheDocument()
  })
})
