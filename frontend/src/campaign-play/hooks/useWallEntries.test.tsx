import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { isOwnWallEntry } from '@/campaign-play/services/ownWallEntries'

import { useAddWallEntry } from './useWallEntries'

// specs/campaign-wall/ux.md section 4.5 (WL-UX-14): the viewer's own post from this tab is not announced as another member's.

const { mockAddWallEntry } = vi.hoisted(() => ({ mockAddWallEntry: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/campaign-play/services/wallEntryApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/campaign-play/services/wallEntryApi')>()),
  addWallEntry: mockAddWallEntry,
}))

describe('useAddWallEntry', () => {
  it('remembers the confirmed entry as own to this tab so its arrival is not announced', async () => {
    mockAddWallEntry.mockResolvedValue({
      id: 'confirmed-1',
      text: 'The lamp goes out.',
      visibility: 'Public',
      createdAt: '2026-10-16T19:02:00Z',
      authorDisplayName: 'Eleanor Hart',
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useAddWallEntry('c1'), { wrapper })

    await act(() => result.current.mutateAsync({ text: 'The lamp goes out.' }))

    expect(isOwnWallEntry('confirmed-1')).toBe(true)
  })
})
