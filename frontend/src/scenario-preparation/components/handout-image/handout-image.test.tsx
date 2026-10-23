import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FileHandout } from '@/scenario-preparation/types/Handout'

import { HandoutImage } from './handout-image'

// specs/scenario-preparation/ux.md section 52; SP-UX-81, SP-UX-82, SP-UX-88, SP-A11Y-46 to SP-A11Y-48.

const { mockUseHandoutFile, refetch } = vi.hoisted(() => ({ mockUseHandoutFile: vi.fn(), refetch: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandoutFile: mockUseHandoutFile }))

const image: FileHandout = {
  id: 'h2',
  kind: 'Image',
  visibility: 'PlayerFacing',
  title: 'Corbitt House',
  file: { name: 'corbitt-house.png', mediaType: 'image/png', sizeBytes: 1_258_291 },
}
const map: FileHandout = { ...image, kind: 'Map' }

const query = (overrides: Record<string, unknown> = {}) => ({
  data: new Blob(['x']),
  isError: false,
  errorUpdatedAt: 0,
  isFetching: false,
  refetch,
  ...overrides,
})
const renderImage = (handout: FileHandout) => render(<HandoutImage campaignId="c1" scenarioId="s1" sceneId="a1" handout={handout} />)

describe('HandoutImage', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test/1', revokeObjectURL: vi.fn() }))
    mockUseHandoutFile.mockReturnValue(query())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows the image under its kind heading with alt equal to the title, and the name and size as text (SP-UX-81, SP-A11Y-46)', () => {
    renderImage(image)

    expect(screen.getByRole('heading', { level: 2, name: 'Image' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Corbitt House' })).toHaveAttribute('src', 'blob:test/1')
    expect(screen.getByText('corbitt-house.png, 1.2 MB')).toBeInTheDocument()
  })

  it('caps an Image at 70vh and lets a Map span the content width (SP-UX-81)', () => {
    const { unmount } = renderImage(image)
    expect(screen.getByRole('img')).toHaveClass('max-h-[70vh]')
    unmount()

    renderImage(map)
    expect(screen.getByRole('heading', { level: 2, name: 'Map' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveClass('w-full')
    expect(screen.getByRole('img')).not.toHaveClass('max-h-[70vh]')
  })

  it('offers "Open full size" in a new tab and "Download" under the original name (SP-UX-82, SP-A11Y-47)', () => {
    renderImage(image)

    const open = screen.getByRole('link', { name: 'Open Corbitt House full size' })
    expect(open).toHaveAttribute('href', 'blob:test/1')
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', 'noopener noreferrer')
    expect(open).toHaveAccessibleDescription('Opens in a new tab')
    const download = screen.getByRole('link', { name: 'Download corbitt-house.png' })
    expect(download).toHaveAttribute('download', 'corbitt-house.png')
  })

  it('fetches the file of this Handout for the Keeper', () => {
    renderImage(image)

    expect(mockUseHandoutFile).toHaveBeenCalledWith('c1', 's1', 'a1', 'h2', true)
  })

  it('shows a busy Skeleton and no actions while loading (SP-UX-88, SP-A11Y-48)', () => {
    mockUseHandoutFile.mockReturnValue(query({ data: undefined }))

    const { container } = renderImage(image)

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows an alert with "Try again", which refetches (SP-UX-88)', async () => {
    mockUseHandoutFile.mockReturnValue(query({ data: undefined, isError: true, errorUpdatedAt: 1 }))
    renderImage(image)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load the image.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('keeps "Try again" mounted, and ignores clicks, while the retry runs', async () => {
    mockUseHandoutFile.mockReturnValue(query({ data: undefined, isError: false, errorUpdatedAt: 1, isFetching: true }))
    renderImage(image)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetch).not.toHaveBeenCalled()
  })
})
