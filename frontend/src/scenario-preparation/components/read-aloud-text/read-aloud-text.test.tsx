import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import { ReadAloudText } from './read-aloud-text'

// specs/scenario-preparation/ux.md section 42; SP-UX-68, SP-A11Y-37, SP-A11Y-38.
const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const document: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('Heading')] },
      { type: 'heading', version: 1, tag: 'h4', children: [text('Subheading')] },
      { type: 'paragraph', version: 1, children: [text('The door creaks open.')] },
    ],
  },
}

describe('ReadAloudText', () => {
  it('is a section labelled by its visible h2 "Read-aloud", so the kind is not told by colour alone (SP-A11Y-38)', () => {
    render(<ReadAloudText document={document} />)

    const panel = screen.getByRole('region', { name: 'Read-aloud' })
    expect(within(panel).getByRole('heading', { level: 2, name: 'Read-aloud' })).toBeVisible()
    expect(within(panel).getByText('The door creaks open.')).toBeInTheDocument()
  })

  it('keeps the text headings at h3 and h4 under the h2 (SP-A11Y-37)', () => {
    render(<ReadAloudText document={document} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Heading' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Subheading' })).toBeInTheDocument()
  })

  it('has a left rule in the primary colour on a muted background, and an icon the screen reader skips', () => {
    render(<ReadAloudText document={document} />)

    const panel = screen.getByRole('region', { name: 'Read-aloud' })
    expect(panel).toHaveClass('border-l-4', 'border-primary', 'bg-muted')
    expect(panel.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
