import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useObjectUrl } from './useObjectUrl'

// specs/scenario-preparation/ux.md section 56 (Data): the preview and the Handout page use an object URL that is revoked.

describe('useObjectUrl', () => {
  const createObjectURL = vi.fn<(blob: Blob) => string>()
  const revokeObjectURL = vi.fn<(url: string) => void>()

  beforeEach(() => {
    let count = 0
    createObjectURL.mockImplementation(() => `blob:test/${++count}`)
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    createObjectURL.mockReset()
    revokeObjectURL.mockReset()
  })

  it('is null without a blob and creates no URL', () => {
    const { result } = renderHook(() => useObjectUrl(null))

    expect(result.current).toBeNull()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('creates a URL for the blob', () => {
    const blob = new Blob(['png'])

    const { result } = renderHook(() => useObjectUrl(blob))

    expect(result.current).toBe('blob:test/1')
    expect(createObjectURL).toHaveBeenCalledWith(blob)
  })

  it('revokes the URL on unmount', () => {
    const blob = new Blob(['png'])
    const { unmount } = renderHook(() => useObjectUrl(blob))

    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1')
  })

  it('revokes the old URL and creates a new one when the blob changes, and creates none for the same blob again', () => {
    const first = new Blob(['one'])
    const second = new Blob(['two'])
    const { result, rerender } = renderHook(({ blob }) => useObjectUrl(blob), { initialProps: { blob: first as Blob | null } })

    rerender({ blob: first })
    expect(createObjectURL).toHaveBeenCalledTimes(1)

    rerender({ blob: second })
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/1')
    expect(result.current).toBe('blob:test/2')

    rerender({ blob: null })
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/2')
    expect(result.current).toBeNull()
  })
})
