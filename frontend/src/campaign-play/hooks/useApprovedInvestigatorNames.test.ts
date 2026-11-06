import { describe, expect, it, vi } from 'vitest'

import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

import { useApprovedInvestigatorNames } from './useApprovedInvestigatorNames'

// PBI-SPL-003: holder names come from the Approved Investigators, so a held Item names who holds it. A roster failure
// surfaces so the caller shows an error with a retry instead of spinning forever.
const { mockUseCampaignMembers, refetchMembers } = vi.hoisted(() => ({
  mockUseCampaignMembers: vi.fn(),
  refetchMembers: vi.fn(),
}))

vi.mock('@/campaign-play/hooks/useCampaignMembers', () => ({ useCampaignMembers: mockUseCampaignMembers }))

const { renderHook } = await import('@testing-library/react')

const member = (id: string, name: string | null): CampaignMember => ({
  memberId: `member-${id}`,
  displayName: name ?? 'A player',
  role: 'Player',
  isYou: false,
  investigator: { visibility: 'Visible', id, name, status: 'Approved' },
})

describe('useApprovedInvestigatorNames', () => {
  it('maps each Approved Investigator id to its name, with "Unnamed Investigator" for a missing name', () => {
    mockUseCampaignMembers.mockReturnValue({
      data: [member('i1', 'Harvey Walters'), member('i2', null)],
      isError: false,
      refetch: refetchMembers,
    })

    const { result } = renderHook(() => useApprovedInvestigatorNames('c1'))

    expect(mockUseCampaignMembers).toHaveBeenCalledWith('c1')
    expect(result.current.names?.get('i1')).toBe('Harvey Walters')
    expect(result.current.names?.get('i2')).toBe('Unnamed Investigator')
    expect(result.current.isError).toBe(false)
  })

  it('has no names while the roster loads, and is empty when no one is Approved', () => {
    mockUseCampaignMembers.mockReturnValue({ data: undefined, isError: false, refetch: refetchMembers })
    const { result: loading, unmount } = renderHook(() => useApprovedInvestigatorNames('c1'))
    expect(loading.current.names).toBeUndefined()
    expect(loading.current.isError).toBe(false)
    unmount()

    mockUseCampaignMembers.mockReturnValue({ data: null, isError: false, refetch: refetchMembers })
    const { result: empty } = renderHook(() => useApprovedInvestigatorNames('c1'))
    expect(empty.current.names?.size).toBe(0)
  })

  it('reports a roster failure with a retry', () => {
    mockUseCampaignMembers.mockReturnValue({ data: undefined, isError: true, refetch: refetchMembers })
    const { result } = renderHook(() => useApprovedInvestigatorNames('c1'))

    expect(result.current.names).toBeUndefined()
    expect(result.current.isError).toBe(true)

    result.current.refetch()
    expect(refetchMembers).toHaveBeenCalled()
  })
})
