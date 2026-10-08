import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { InvestigatorConflictError } from '@/campaign-play/services/investigatorApi'

import { useCreateInvestigator, useDeleteInvestigator, useSaveCharacterSheet } from './useMyInvestigator'

const { mockCreate, mockSave, mockDelete } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockSave: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))

vi.mock('@/campaign-play/services/investigatorApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/campaign-play/services/investigatorApi')>()),
  createInvestigator: mockCreate,
  saveMyCharacterSheet: mockSave,
  deleteMyInvestigator: mockDelete,
}))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useMyInvestigator mutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reloads the Campaign and the Investigator when creation is refused (ux.md section 3.2)', async () => {
    mockCreate.mockRejectedValue(new InvestigatorConflictError())
    const { queryClient, wrapper } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateInvestigator('c1'), { wrapper })

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: campaignQueryKeys.detail('c1'), exact: true })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: campaignQueryKeys.myInvestigator('c1') })
  })

  it('stores the recomputed Character Sheet after a save', async () => {
    const saved = { investigatorId: 'i1', status: 'Draft' }
    mockSave.mockResolvedValue(saved)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useSaveCharacterSheet('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        identity: { name: 'Harvey', age: 25, gender: null, residence: null, birthplace: null },
        creationMethod: 'PointBuy',
        characteristics: {},
        characteristicRolls: {},
        occupation: null,
        skills: [],
        quickFire: { values: [], personalInterests: [] },
        ageEffects: { deductions: {}, eduImprovementChecks: [] },
        luckRolls: [],
      })
    })

    expect(queryClient.getQueryData(campaignQueryKeys.myCharacterSheet('c1'))).toEqual(saved)
  })

  it('forgets the Investigator after "Start over"', async () => {
    mockDelete.mockResolvedValue(undefined)
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(campaignQueryKeys.myInvestigator('c1'), { id: 'i1' })
    const { result } = renderHook(() => useDeleteInvestigator('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(queryClient.getQueryData(campaignQueryKeys.myInvestigator('c1'))).toBeNull()
  })
})
