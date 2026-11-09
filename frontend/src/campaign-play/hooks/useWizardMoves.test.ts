import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvestigatorConflictError } from '@/campaign-play/services/investigatorApi'
import { myCharacterSheet, sheetView, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { useWizardMoves } from './useWizardMoves'

const {
  mockUseSheet,
  mockRefetch,
  mockSave,
  mockRollCharacteristics,
  mockRollLuck,
  mockRollEdu,
  mockSubmit,
  mockDelete,
  navigateSpy,
} = vi.hoisted(() => ({
  mockUseSheet: vi.fn(),
  mockRefetch: vi.fn(),
  mockSave: vi.fn(),
  mockRollCharacteristics: vi.fn(),
  mockRollLuck: vi.fn(),
  mockRollEdu: vi.fn(),
  mockSubmit: vi.fn(),
  mockDelete: vi.fn(),
  navigateSpy: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateSpy }))

vi.mock('./useMyInvestigator', () => ({
  useMyCharacterSheet: mockUseSheet,
  useSaveCharacterSheet: () => ({ mutateAsync: mockSave, isPending: false }),
  useRollCharacteristics: () => ({ mutateAsync: mockRollCharacteristics, isPending: false }),
  useRollLuck: () => ({ mutateAsync: mockRollLuck, isPending: false }),
  useRollEduImprovementCheck: () => ({ mutateAsync: mockRollEdu, isPending: false }),
  useSubmitInvestigator: () => ({ mutateAsync: mockSubmit, isPending: false }),
  useDeleteInvestigator: () => ({ mutateAsync: mockDelete, isPending: false }),
}))

function options() {
  return {
    campaignId: 'c1',
    step: 'characteristics' as const,
    sheet: myCharacterSheet(),
    onStayWithErrors: vi.fn(),
    onSaved: vi.fn(),
    onSubmitRejected: vi.fn(),
  }
}

/** specs/character-sheet/ux.md section 6.8: one roll flow per creation roll group (PBI-DICE-003, D8). */
describe('useWizardMoves creation rolls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSheet.mockReturnValue({ refetch: mockRefetch })
    mockRefetch.mockResolvedValue({ data: myCharacterSheet() })
  })

  it('one confirmation saves once and rolls once, reporting the group', async () => {
    const rolled = myCharacterSheet({ characterSheet: sheetView({ luckRolls: [11] }) })
    mockSave.mockResolvedValue(myCharacterSheet())
    mockRollLuck.mockResolvedValue(rolled)
    const opts = options()
    const { result } = renderHook(() => useWizardMoves(opts))

    await act(async () => {
      await result.current.roll('luck', validInputs)
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave).toHaveBeenCalledWith(validInputs)
    expect(mockRollLuck).toHaveBeenCalledTimes(1)
    expect(mockRollCharacteristics).not.toHaveBeenCalled()
    expect(mockRollEdu).not.toHaveBeenCalled()
    expect(result.current.rollStatus).toEqual({ state: 'rolled', group: 'luck' })
  })

  it('keeps each failed roll status on its own group', async () => {
    mockSave.mockResolvedValue(myCharacterSheet())
    mockRollEdu.mockRejectedValue(new Error('Failed to roll (500)'))
    const opts = { ...options(), step: 'age' as const }
    const { result } = renderHook(() => useWizardMoves(opts))

    await act(async () => {
      await result.current.roll('eduImprovementCheck', validInputs)
    })

    expect(result.current.rollStatus).toEqual({ state: 'rollFailed', group: 'eduImprovementCheck' })
  })

  it('ignores a second roll while one is pending', async () => {
    let resolveSave!: (saved: unknown) => void
    mockSave.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve }))
    mockRollLuck.mockResolvedValue(myCharacterSheet({ characterSheet: sheetView({ luckRolls: [11] }) }))
    const { result } = renderHook(() => useWizardMoves(options()))

    act(() => {
      void result.current.roll('luck', validInputs)
    })
    await waitFor(() => expect(result.current.rollStatus.state).toBe('pending'))
    await act(async () => {
      await result.current.roll('luck', validInputs)
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockRollLuck).not.toHaveBeenCalled()

    await act(async () => {
      resolveSave(myCharacterSheet())
    })
  })

  it('retries a failed roll without saving again', async () => {
    mockSave.mockResolvedValue(myCharacterSheet())
    mockRollLuck
      .mockRejectedValueOnce(new Error('Failed to roll (500)'))
      .mockResolvedValueOnce(myCharacterSheet({ characterSheet: sheetView({ luckRolls: [11] }) }))
    const { result } = renderHook(() => useWizardMoves(options()))

    await act(async () => {
      await result.current.roll('luck', validInputs)
    })
    expect(result.current.rollStatus).toEqual({ state: 'rollFailed', group: 'luck' })

    await act(async () => {
      await result.current.retryRoll()
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockRollLuck).toHaveBeenCalledTimes(2)
    expect(result.current.rollStatus).toEqual({ state: 'rolled', group: 'luck' })
  })

  it('a 409 on the move reloads the sheet and raises the move conflict', async () => {
    const fresh = myCharacterSheet()
    mockSave.mockRejectedValue(new InvestigatorConflictError())
    mockRefetch.mockResolvedValue({ data: fresh })
    const opts = options()
    const { result } = renderHook(() => useWizardMoves(opts))

    await act(async () => {
      await result.current.move({ kind: 'continue' }, validInputs)
    })

    expect(mockRefetch).toHaveBeenCalled()
    expect(result.current.moveConflict).toBe(true)
    expect(opts.onSaved).toHaveBeenCalled()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('a 409 on the roll reports already rolled when the reload has results', async () => {
    mockSave.mockResolvedValue(myCharacterSheet())
    mockRollLuck.mockRejectedValue(new InvestigatorConflictError())
    mockRefetch.mockResolvedValue({ data: myCharacterSheet({ characterSheet: sheetView({ luckRolls: [11] }) }) })
    const { result } = renderHook(() => useWizardMoves(options()))

    await act(async () => {
      await result.current.roll('luck', validInputs)
    })

    expect(mockRefetch).toHaveBeenCalled()
    expect(result.current.rollStatus).toEqual({ state: 'alreadyRolled', group: 'luck' })
  })

  it('a 409 on the roll asks for a reload when the reload has no results', async () => {
    mockSave.mockResolvedValue(myCharacterSheet())
    mockRollLuck.mockRejectedValue(new InvestigatorConflictError())
    mockRefetch.mockResolvedValue({ data: myCharacterSheet({ characterSheet: sheetView({ luckRolls: [] }) }) })
    const { result } = renderHook(() => useWizardMoves(options()))

    await act(async () => {
      await result.current.roll('luck', validInputs)
    })

    expect(result.current.rollStatus).toEqual({ state: 'rollConflict', group: 'luck' })
  })

  it('a 409 on the save before the roll reports the save conflict', async () => {
    mockSave.mockRejectedValue(new InvestigatorConflictError())
    const { result } = renderHook(() => useWizardMoves(options()))

    await act(async () => {
      await result.current.roll('luck', validInputs)
    })

    expect(mockRollLuck).not.toHaveBeenCalled()
    expect(result.current.rollStatus).toEqual({ state: 'saveConflict', group: 'luck' })
  })
})
