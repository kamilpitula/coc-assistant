import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlayerReveal } from '@/scene-play/types/Reveal'
import type { RichTextDocument } from '@/shared/types/RichText'

import { RevealedContent } from './revealed-content'

// specs/scene-play/ux.md section 14; SPL-UX-27, SPL-UX-30, SPL-A11Y-8, SPL-A11Y-10.

const { mockUseRevealFile, refetch } = vi.hoisted(() => ({ mockUseRevealFile: vi.fn(), refetch: vi.fn() }))
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: mockUseRevealFile }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const document: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('Inside heading')] },
      { type: 'paragraph', version: 1, children: [text('The door creaks open.')] },
    ],
  },
}

const reveal = (overrides: Partial<PlayerReveal>): PlayerReveal => ({
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: document,
  file: null,
  imageDescription: null,
  ...overrides,
})
const file = { name: 'cellar.png', mediaType: 'image/png', sizeBytes: 1_258_291 }
const query = (overrides: Record<string, unknown> = {}) => ({ data: new Blob(['x']), isError: false, errorUpdatedAt: 0, isFetching: false, refetch, ...overrides })

describe('RevealedContent', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test/1', revokeObjectURL: vi.fn() }))
    mockUseRevealFile.mockReturnValue(query())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows a Read-aloud Reveal in the read-aloud panel without a heading of its own, with text headings from h4 (SPL-UX-27, SPL-A11Y-8)', () => {
    render(<RevealedContent campaignId="c1" reveal={reveal({})} />)

    expect(screen.getByText('The door creaks open.')).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Inside heading' })).toBeInTheDocument()
    expect(mockUseRevealFile).not.toHaveBeenCalled()
  })

  it('shows a Text Reveal as rich text with headings from h4', () => {
    render(<RevealedContent campaignId="c1" reveal={reveal({ handoutKind: 'Text' })} />)

    expect(screen.getByRole('heading', { level: 4, name: 'Inside heading' })).toBeInTheDocument()
  })

  it('shows only the Player-facing description of a Non-Player Entity, and nothing when it has none (SPL-UX-27)', () => {
    const { container, rerender } = render(<RevealedContent campaignId="c1" reveal={reveal({ subjectType: 'NonPlayerEntity', handoutKind: null })} />)
    expect(screen.getByText('The door creaks open.')).toBeInTheDocument()

    rerender(<RevealedContent campaignId="c1" reveal={reveal({ subjectType: 'NonPlayerEntity', handoutKind: null, content: null })} />)
    expect(container.textContent).toBe('')
  })

  it('shows an Image capped at 70vh with the image description as alt, and the title when there is none (SPL-UX-27, SPL-A11Y-10)', () => {
    const { rerender } = render(
      <RevealedContent campaignId="c1" reveal={reveal({ handoutKind: 'Image', content: null, file, imageDescription: 'A plan of the cellar' })} />,
    )
    expect(screen.getByRole('img', { name: 'A plan of the cellar' })).toHaveClass('max-h-[70vh]')
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()

    rerender(<RevealedContent campaignId="c1" reveal={reveal({ handoutKind: 'Image', content: null, file })} />)
    expect(screen.getByRole('img', { name: 'The front door' })).toBeInTheDocument()
  })

  it('shows a Map across the full width with no height cap, outside the reading column (SPL-UX-27)', () => {
    const { container } = render(<RevealedContent campaignId="c1" reveal={reveal({ handoutKind: 'Map', content: null, file })} />)

    expect(screen.getByRole('img')).toHaveClass('w-full')
    expect(screen.getByRole('img')).not.toHaveClass('max-h-[70vh]')
    expect(container.firstElementChild).not.toHaveClass('max-w-2xl')
  })

  it('fetches the file of this Reveal and offers "Open full size" and "Download"', () => {
    render(<RevealedContent campaignId="c1" reveal={reveal({ handoutKind: 'Map', content: null, file })} />)

    expect(mockUseRevealFile).toHaveBeenCalledWith('c1', 'r1', true)
    expect(screen.getByRole('link', { name: 'Open The front door full size' })).toHaveAttribute('href', 'blob:test/1')
    expect(screen.getByRole('link', { name: 'Download cellar.png' })).toBeInTheDocument()
  })

  it('shows a Document with "Open" and "Download" (SPL-UX-27)', () => {
    render(<RevealedContent campaignId="c1" reveal={reveal({ handoutKind: 'Document', content: null, file: { name: 'letter.pdf', mediaType: 'application/pdf', sizeBytes: 1200 } })} />)

    expect(screen.getByRole('link', { name: 'Open letter.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download letter.pdf' })).toBeInTheDocument()
  })

  it('shows the load failure of a file with "Try again", which refetches', () => {
    mockUseRevealFile.mockReturnValue(query({ data: undefined, isError: true }))
    render(<RevealedContent campaignId="c1" reveal={reveal({ handoutKind: 'Image', content: null, file })} />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the image.")
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(refetch).toHaveBeenCalled()
  })
})
