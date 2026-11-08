import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useAddWallEntryForm, WALL_ENTRY_ADDED_MESSAGE } from './useAddWallEntryForm'

// specs/campaign-wall/ux.md sections 4.2 and 4.5; WL-UX-2, WL-UX-6.
// The Wall page and the Active Scene share this one add flow (PBI-SPL-007 D3).

const { mockMutateAsync, mockPending } = vi.hoisted(() => ({ mockMutateAsync: vi.fn(), mockPending: { value: false } }))

vi.mock('@/campaign-play/hooks/useWallEntries', () => ({
  useAddWallEntry: () => ({ mutateAsync: mockMutateAsync, isPending: mockPending.value }),
}))

function renderForm(onAdded: () => void = vi.fn()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => useAddWallEntryForm('c1', onAdded), { wrapper }), onAdded }
}

describe('useAddWallEntryForm', () => {
  it('posts the entry and calls onAdded on success (WL-UX-2)', async () => {
    mockMutateAsync.mockResolvedValue({ id: 'new' })
    const onAdded = vi.fn()
    const { result } = renderForm(onAdded)

    let posted: boolean | undefined
    await act(() => result.current.submit({ text: 'The lamp goes out.', visibility: 'Public' }).then((value) => { posted = value }))

    expect(mockMutateAsync).toHaveBeenCalledWith({ text: 'The lamp goes out.', visibility: 'Public' })
    expect(posted).toBe(true)
    expect(onAdded).toHaveBeenCalledTimes(1)
    expect(result.current.failed).toBe(false)
    expect(WALL_ENTRY_ADDED_MESSAGE).toBe('Wall Entry added.')
  })

  it('keeps failed true and skips onAdded when the post fails (WL-UX-6)', async () => {
    mockMutateAsync.mockRejectedValue(new Error('boom'))
    const onAdded = vi.fn()
    const { result } = renderForm(onAdded)

    let posted: boolean | undefined
    await act(() => result.current.submit({ text: 'Keep me' }).then((value) => { posted = value }))

    expect(posted).toBe(false)
    expect(result.current.failed).toBe(true)
    expect(onAdded).not.toHaveBeenCalled()
  })

  it('a new submit clears a previous failure', async () => {    mockMutateAsync.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ id: 'new' })
    const { result } = renderForm()

    await act(() => result.current.submit({ text: 'Keep me' }))
    expect(result.current.failed).toBe(true)

    await act(() => result.current.submit({ text: 'Keep me' }))
    expect(result.current.failed).toBe(false)
  })

  it('mirrors the mutation pending state', () => {
    mockPending.value = true
    const { result } = renderForm()
    expect(result.current.pending).toBe(true)
    mockPending.value = false
  })
})
