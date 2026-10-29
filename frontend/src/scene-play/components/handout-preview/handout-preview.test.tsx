import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Handout } from '@/scenario-preparation/types/Handout'

import { HandoutPreview } from './handout-preview'

// specs/scene-play/ux.md section 12 (Show content); SPL-UX-25, SPL-A11Y-8.
const { mockUseHandout, mockUseHandoutFile, refetch } = vi.hoisted(() => ({ mockUseHandout: vi.fn(), mockUseHandoutFile: vi.fn(), refetch: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandout: mockUseHandout, useHandoutFile: mockUseHandoutFile }))

const owner = { type: 'scene', campaignId: 'c1', scenarioId: 'p1', sceneId: 's1' } as const
const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content = { root: { type: 'root' as const, children: [{ type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] }, { type: 'paragraph', version: 1, children: [text('The door creaks open.')] }] } }
const richText = (kind: 'ReadAloud' | 'Text'): Handout => ({ id: 'h1', kind, visibility: 'PlayerFacing', title: 'The front door', content })
const image: Handout = {
  id: 'h2',
  kind: 'Image',
  visibility: 'PlayerFacing',
  title: 'Corbitt House',
  file: { name: 'corbitt-house.png', mediaType: 'image/png', sizeBytes: 1000 },
  imageDescription: 'A plan of the cellar',
}

describe('HandoutPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test/1', revokeObjectURL: vi.fn() }))
    mockUseHandoutFile.mockReturnValue({ data: new Blob(['x']), isError: false, errorUpdatedAt: 0, isFetching: false, refetch })
  })

  it('loads the Handout of the Scene for the Keeper', () => {
    mockUseHandout.mockReturnValue({ data: richText('Text'), isError: false, refetch })
    render(<HandoutPreview owner={owner} handoutId="h1" />)

    expect(mockUseHandout).toHaveBeenCalledWith(owner, 'h1', true)
  })

  it('shows a Read-aloud Handout in its panel and a Text Handout as rich text, with headings below the item\'s h3 (SPL-A11Y-8)', () => {
    mockUseHandout.mockReturnValue({ data: richText('ReadAloud'), isError: false, refetch })
    const { rerender } = render(<HandoutPreview owner={owner} handoutId="h1" />)
    expect(screen.getByText('The door creaks open.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Inside' })).toBeInTheDocument()

    mockUseHandout.mockReturnValue({ data: richText('Text'), isError: false, refetch })
    rerender(<HandoutPreview owner={owner} handoutId="h1" />)
    expect(screen.getByRole('heading', { level: 4, name: 'Inside' })).toBeInTheDocument()
  })

  it('shows an Image with the description as alt and as text, and a Document with its actions', () => {
    mockUseHandout.mockReturnValue({ data: image, isError: false, refetch })
    const { rerender } = render(<HandoutPreview owner={owner} handoutId="h2" />)
    expect(screen.getByRole('img', { name: 'A plan of the cellar' })).toBeInTheDocument()
    expect(screen.getByText('Image description: A plan of the cellar')).toBeInTheDocument()

    mockUseHandout.mockReturnValue({ data: { ...image, kind: 'Document', file: { name: 'letter.pdf', mediaType: 'application/pdf', sizeBytes: 1000 } }, isError: false, refetch })
    rerender(<HandoutPreview owner={owner} handoutId="h2" />)
    expect(screen.getByRole('link', { name: 'Open letter.pdf' })).toBeInTheDocument()
  })

  it('shows a Skeleton while loading, a "gone" line for a 404, and "Try again" on a failure', async () => {
    mockUseHandout.mockReturnValue({ data: undefined, isError: false, refetch })
    const { container, rerender } = render(<HandoutPreview owner={owner} handoutId="h1" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseHandout.mockReturnValue({ data: null, isError: false, refetch })
    rerender(<HandoutPreview owner={owner} handoutId="h1" />)
    expect(screen.getByText('This Handout is gone.')).toBeInTheDocument()

    mockUseHandout.mockReturnValue({ data: undefined, isError: true, refetch })
    rerender(<HandoutPreview owner={owner} handoutId="h1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
