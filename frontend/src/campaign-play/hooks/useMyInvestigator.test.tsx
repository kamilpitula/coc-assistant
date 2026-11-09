import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { InvestigatorConflictError } from '@/campaign-play/services/investigatorApi'
import { EMPTY_BACKSTORY } from '@/campaign-play/state/characterSheetForm'

import { useCreateInvestigator, useDeleteInvestigator, useRollCharacteristics, useRollEduImprovementCheck, useRollLuck, useSaveCharacterSheet } from './useMyInvestigator'

const { mockCreate, mockSave, mockDelete, mockRollCharacteristics, mockRollLuck, mockRollEdu } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockSave: vi.fn(),
  mockDelete: vi.fn(),
  mockRollCharacteristics: vi.fn(),
  mockRollLuck: vi.fn(),
  mockRollEdu: vi.fn(),
}))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))

vi.mock('@/campaign-play/services/investigatorApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/campaign-play/services/investigatorApi')>()),
  createInvestigator: mockCreate,
  saveMyCharacterSheet: mockSave,
  deleteMyInvestigator: mockDelete,
  rollMyCharacteristics: mockRollCharacteristics,
  rollMyLuck: mockRollLuck,
  rollMyEduImprovementCheck: mockRollEdu,
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

  it('stores the recomputed Character Sheet after a save', async () => {    const saved = { investigatorId: 'i1', status: 'Draft' }
    mockSave.mockResolvedValue(saved)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useSaveCharacterSheet('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        identity: { name: 'Harvey', age: 25, gender: null, residence: null, birthplace: null },
        creationMethod: 'PointBuy',
        characteristics: {},
        ageEffects: { deductions: {} },
        occupation: null,
        skills: [],
        quickFire: { values: [], personalInterests: [] },
        backstory: EMPTY_BACKSTORY,
        keyConnection: null,
        weapons: [],
        gear: null,
      })
    })

    expect(queryClient.getQueryData(campaignQueryKeys.myCharacterSheet('c1'))).toEqual(saved)
  })

  it('stores the recomputed Character Sheet after rolling the characteristics', async () => {
    const rolled = { investigatorId: 'i1', status: 'Draft' }
    mockRollCharacteristics.mockResolvedValue(rolled)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useRollCharacteristics('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(mockRollCharacteristics).toHaveBeenCalledWith('token', 'c1')
    expect(queryClient.getQueryData(campaignQueryKeys.myCharacterSheet('c1'))).toEqual(rolled)
  })

  it('stores the recomputed Character Sheet after rolling Luck', async () => {
    const rolled = { investigatorId: 'i1', status: 'Draft' }
    mockRollLuck.mockResolvedValue(rolled)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useRollLuck('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(mockRollLuck).toHaveBeenCalledWith('token', 'c1')
    expect(queryClient.getQueryData(campaignQueryKeys.myCharacterSheet('c1'))).toEqual(rolled)
  })

  it('stores the recomputed Character Sheet after rolling the EDU improvement check', async () => {
    const rolled = { investigatorId: 'i1', status: 'Draft' }
    mockRollEdu.mockResolvedValue(rolled)
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useRollEduImprovementCheck('c1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(mockRollEdu).toHaveBeenCalledWith('token', 'c1')
    expect(queryClient.getQueryData(campaignQueryKeys.myCharacterSheet('c1'))).toEqual(rolled)
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
