import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FileHandout } from '@/scenario-preparation/types/Handout'

import { HandoutDocument } from './handout-document'

// specs/scenario-preparation/ux.md section 53; SP-UX-82, SP-UX-83, SP-UX-88, SP-A11Y-47, SP-A11Y-48.

const { mockUseHandoutFile, refetch } = vi.hoisted(() => ({ mockUseHandoutFile: vi.fn(), refetch: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandoutFile: mockUseHandoutFile }))

const document1: FileHandout = {
  id: 'h3',
  kind: 'Document',
  visibility: 'KeeperFacing',
  title: 'Diary',
  file: { name: 'diary-page.pdf', mediaType: 'application/pdf', sizeBytes: 1_258_291 },
}

const query = (overrides: Record<string, unknown> = {}) => ({
  data: new Blob(['x']),
  isError: false,
  errorUpdatedAt: 0,
  isFetching: false,
  refetch,
  ...overrides,
})
const renderDocument = () => render(<HandoutDocument campaignId="c1" scenarioId="s1" sceneId="a1" handout={document1} />)

describe('HandoutDocument', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test/1', revokeObjectURL: vi.fn() }))
    mockUseHandoutFile.mockReturnValue(query())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows the name, "PDF, {size}", and no inline preview (SP-UX-83)', () => {
    renderDocument()

    expect(screen.getByRole('heading', { level: 2, name: 'Document' })).toBeInTheDocument()
    expect(screen.getByText('diary-page.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF, 1.2 MB')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('offers "Open" in a new tab and "Download" under the original name as plain links (SP-UX-82, SP-A11Y-47)', () => {
    renderDocument()

    const open = screen.getByRole('link', { name: 'Open diary-page.pdf' })
    expect(open).toHaveAttribute('href', 'blob:test/1')
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')
    expect(open).toHaveAccessibleDescription('Opens in a new tab')
    expect(screen.getByRole('link', { name: 'Download diary-page.pdf' })).toHaveAttribute('download', 'diary-page.pdf')
  })

  it('shows a busy Skeleton and no actions while loading (SP-UX-88)', () => {
    mockUseHandoutFile.mockReturnValue(query({ data: undefined }))

    const { container } = renderDocument()

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows an alert with "Try again", which refetches (SP-UX-88)', async () => {
    mockUseHandoutFile.mockReturnValue(query({ data: undefined, isError: true, errorUpdatedAt: 1 }))
    renderDocument()

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the document.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
