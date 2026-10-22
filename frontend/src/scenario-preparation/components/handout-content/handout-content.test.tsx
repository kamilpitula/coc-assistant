import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import { HandoutContent } from './handout-content'

// specs/scenario-preparation/ux.md section 42; SP-UX-68, SP-A11Y-37.
const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('Heading')] },
      { type: 'paragraph', version: 1, children: [text('A letter from the cellar.')] },
    ],
  },
}

describe('HandoutContent', () => {
  it('shows a Read-aloud Handout in the Read-aloud panel (SP-UX-68)', () => {
    render(<HandoutContent kind="ReadAloud" content={content} />)

    expect(screen.getByRole('region', { name: 'Read-aloud' })).toHaveTextContent('A letter from the cellar.')
  })

  it('shows a Text Handout under an h2 "Text" without the panel (SP-UX-68)', () => {
    render(<HandoutContent kind="Text" content={content} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Text' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Read-aloud' })).not.toBeInTheDocument()
    expect(screen.getByText('A letter from the cellar.')).toBeInTheDocument()
  })

  it.each(['ReadAloud', 'Text'] as const)('renders the %s text headings as h3 and not lower (SP-A11Y-37)', (kind) => {
    render(<HandoutContent kind={kind} content={content} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Heading' })).toBeInTheDocument()
  })
})
