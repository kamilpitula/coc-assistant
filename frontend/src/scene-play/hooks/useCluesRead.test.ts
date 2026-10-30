import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Clues } from '@/scene-play/types/Reveal'

import { useCluesRead } from './useCluesRead'

// specs/scene-play/ux.md section 15; SPL-UX-32, SPL-UX-34.
const { mockUseCampaign, mockUseMyClues, mockUseInvestigatorClues, mockUseAnnouncement } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseMyClues: vi.fn(),
  mockUseInvestigatorClues: vi.fn(),
  mockUseAnnouncement: vi.fn(),
}))
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scene-play/hooks/useReveals', () => ({
  useMyClues: mockUseMyClues,
  useInvestigatorClues: mockUseInvestigatorClues,
  useRevealAnnouncement: mockUseAnnouncement,
}))

const clues: Clues = { investigatorName: 'Harvey Walters', clues: [] }
const query = (data: Clues | null | undefined) => ({ data, isFetchedAfterMount: true })

describe('useCluesRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMyClues.mockReturnValue(query(clues))
    mockUseInvestigatorClues.mockReturnValue(query(undefined))
    mockUseAnnouncement.mockReturnValue({ message: '', sequence: 0 })
  })

  it('lets a Player read their own Clues and nothing of the Keeper route', () => {
    mockUseCampaign.mockReturnValue({ data: { role: 'Player' } })

    const { result } = renderHook(() => useCluesRead('c1', undefined))

    expect(mockUseMyClues).toHaveBeenCalledWith('c1', true)
    expect(mockUseInvestigatorClues).toHaveBeenCalledWith('c1', '', false)
    expect(result.current).toMatchObject({ isKeeperRoute: false, wrongRole: false })
    expect(result.current.query.data).toBe(clues)
  })

  it('lets the Keeper read the named Investigator and announces nothing for it', () => {
    mockUseCampaign.mockReturnValue({ data: { role: 'Keeper' } })
    mockUseInvestigatorClues.mockReturnValue(query(clues))

    const { result } = renderHook(() => useCluesRead('c1', 'i1'))

    expect(mockUseInvestigatorClues).toHaveBeenCalledWith('c1', 'i1', true)
    expect(mockUseMyClues).toHaveBeenCalledWith('c1', false)
    expect(result.current).toMatchObject({ isKeeperRoute: true, wrongRole: false })
    expect(mockUseAnnouncement).toHaveBeenCalledWith(undefined, 'Harvey Walters', true)
  })

  it('announces a Player\'s new Clues', () => {
    mockUseCampaign.mockReturnValue({ data: { role: 'Player' } })

    renderHook(() => useCluesRead('c1', undefined))

    expect(mockUseAnnouncement).toHaveBeenCalledWith(clues.clues, 'Harvey Walters', true)
  })

  it('reads nothing for the wrong role, on either route', () => {
    mockUseCampaign.mockReturnValue({ data: { role: 'Player' } })
    expect(renderHook(() => useCluesRead('c1', 'i1')).result.current.wrongRole).toBe(true)
    expect(mockUseInvestigatorClues).toHaveBeenLastCalledWith('c1', 'i1', false)

    mockUseCampaign.mockReturnValue({ data: { role: 'Keeper' } })
    expect(renderHook(() => useCluesRead('c1', undefined)).result.current.wrongRole).toBe(true)
    expect(mockUseMyClues).toHaveBeenLastCalledWith('c1', false)
  })

  it('waits for the Campaign before judging the role', () => {
    mockUseCampaign.mockReturnValue({ data: undefined })

    const { result } = renderHook(() => useCluesRead('c1', undefined))

    expect(result.current.wrongRole).toBe(false)
    expect(mockUseMyClues).toHaveBeenCalledWith('c1', false)
  })
})
