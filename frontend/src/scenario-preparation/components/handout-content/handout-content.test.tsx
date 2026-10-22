import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Handout } from '@/scenario-preparation/types/Handout'
import type { RichTextDocument } from '@/shared/types/RichText'

import { HandoutContent } from './handout-content'

// specs/scenario-preparation/ux.md sections 42, 52, 53; SP-UX-68, SP-UX-81, SP-UX-83, SP-A11Y-37.

const { mockUseHandoutFile } = vi.hoisted(() => ({ mockUseHandoutFile: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandoutFile: mockUseHandoutFile }))

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

const richText = (kind: 'ReadAloud' | 'Text'): Handout => ({ id: 'h1', kind, visibility: 'PlayerFacing', title: 'A letter', content })
const fileHandout = (kind: 'Image' | 'Document' | 'Map'): Handout => ({
  id: 'h2',
  kind,
  visibility: 'PlayerFacing',
  title: 'Corbitt House',
  file: { name: 'corbitt-house.png', mediaType: 'image/png', sizeBytes: 1_258_291 },
})
const ids = { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' }

describe('HandoutContent', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test/1', revokeObjectURL: vi.fn() }))
    mockUseHandoutFile.mockReturnValue({ data: new Blob(['x']), isError: false, errorUpdatedAt: 0, isFetching: false, refetch: vi.fn() })
  })

  it('shows a Read-aloud Handout in the Read-aloud panel (SP-UX-68)', () => {
    render(<HandoutContent handout={richText('ReadAloud')} {...ids} />)

    expect(screen.getByRole('region', { name: 'Read-aloud' })).toHaveTextContent('A letter from the cellar.')
  })

  it('shows a Text Handout under an h2 "Text" without the panel (SP-UX-68)', () => {
    render(<HandoutContent handout={richText('Text')} {...ids} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Text' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Read-aloud' })).not.toBeInTheDocument()
  })

  it.each(['ReadAloud', 'Text'] as const)('renders the %s text headings as h3 and not lower (SP-A11Y-37)', (kind) => {
    render(<HandoutContent handout={richText(kind)} {...ids} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Heading' })).toBeInTheDocument()
  })

  it.each([
    ['Image', 'Image'],
    ['Map', 'Map'],
  ] as const)('shows a %s Handout as an image under an h2 "%s" (SP-UX-81)', (kind, heading) => {
    render(<HandoutContent handout={fileHandout(kind)} {...ids} />)

    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Corbitt House' })).toBeInTheDocument()
  })

  it('shows a Document Handout as a name with Open and Download, without an inline preview (SP-UX-83)', () => {
    render(<HandoutContent handout={fileHandout('Document')} {...ids} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Document' })).toBeInTheDocument()
    expect(screen.getByText('corbitt-house.png')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open corbitt-house.png' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
