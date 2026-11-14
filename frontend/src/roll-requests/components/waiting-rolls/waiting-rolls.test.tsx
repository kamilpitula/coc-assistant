import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AlreadyRolledError, RequestedRollCancelledError } from '@/roll-requests/services/rollRequestApi'
import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'

import { WaitingRolls } from './waiting-rolls'

// specs/roll-requests/ux.md sections 4 and 17.1; RR-UX-7, RR-UX-20, RR-A11Y-15.
const { mockUseActiveSceneRollRequests, mockMutate, mockCancelMutate } = vi.hoisted(() => ({ mockUseActiveSceneRollRequests: vi.fn(), mockMutate: vi.fn(), mockCancelMutate: vi.fn() }))

vi.mock('@/roll-requests/hooks/useRollRequests', () => ({
  useActiveSceneRollRequests: mockUseActiveSceneRollRequests,
  useRollRequestedRoll: () => ({ mutate: mockMutate, isPending: false }),
  useCancelRequestedRoll: () => ({ mutate: mockCancelMutate, isPending: false }),
}))

interface RollCallbacks {
  onSuccess: (result: RequestedRoll) => void
  onError: (error: Error) => void
}

function waitingRoll(overrides: Partial<RequestedRoll> = {}): RequestedRoll {
  return {
    investigatorId: 'i1',
    investigatorName: 'Harvey Walters',
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: true,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Waiting',
    rolls: [],
    ...overrides,
  }
}

function request(id: string, overrides: Partial<RollRequest> = {}): RollRequest {
  return {
    id,
    target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
    message: 'Something moves upstairs.',
    visibility: 'Public',
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt: '2026-11-12T19:21:00Z',
    requestedRolls: [waitingRoll()],
    ...overrides,
  }
}

const lucyRoll = waitingRoll({ investigatorId: 'i2', investigatorName: 'Lucy Ward', targetValue: 45, usesBaseValue: true, difficulty: 'Hard', bonusDice: 0, penaltyDice: 1 })
const requests = [
  request('r1'),
  request('r2', { target: { kind: 'Skill', skill: 'Listen', specialization: null, characteristic: null }, message: null, requestedRolls: [lucyRoll] }),
]

const rolledHarvey: RequestedRoll = {
  ...waitingRoll(),
  status: 'Rolled',
  rolls: [
    {
      dice: '1d100',
      result: 25,
      faces: [20, 5],
      rolledBy: 'Eleanor Hart',
      rolledAt: '2026-11-12T19:22:00Z',
      percentile: { unitsFace: 5, tensFaces: [20], keptTens: 20, result: 25, successLevel: 'Hard', isSuccess: true },
      earnsExperienceCheck: true,
    },
  ],
}

function setup(data: RollRequest[] | null | undefined = requests) {
  mockUseActiveSceneRollRequests.mockReturnValue({ data, isPending: data === undefined, isError: false, refetch: vi.fn() })
  mockMutate.mockReset()
  mockCancelMutate.mockReset()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const view = render(<WaitingRolls campaignId="c1" />, { wrapper })
  return { ...view, rerenderWith: (next: RollRequest[] | null | undefined) => {
    mockUseActiveSceneRollRequests.mockReturnValue({ data: next, isPending: next === undefined, isError: false, refetch: vi.fn() })
    view.rerender(<WaitingRolls campaignId="c1" />)
  } }
}

function captureRoll() {
  let callbacks: RollCallbacks | undefined
  mockMutate.mockImplementation((_input: unknown, options: RollCallbacks) => {
    callbacks = options
  })
  return () => {
    if (!callbacks) {
      throw new Error('expected the roll to be requested')
    }
    return callbacks
  }
}

function captureCancel() {
  let callbacks: { onSuccess: () => void; onError: (error: Error) => void } | undefined
  mockCancelMutate.mockImplementation((_input: unknown, options: { onSuccess: () => void; onError: (error: Error) => void }) => {
    callbacks = options
  })
  return () => {
    if (!callbacks) {
      throw new Error('expected the cancel to be requested')
    }
    return callbacks
  }
}

describe('WaitingRolls', () => {
  it('lists every Waiting row oldest first with name, target, dice, time, and the message on one line (RR-UX-7)', () => {
    setup()

    expect(screen.getByRole('heading', { level: 2, name: 'Waiting rolls, 2' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 }).querySelector('.sr-only')).toHaveTextContent(', 2')
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Harvey Walters . Spot Hidden . Regular . no Bonus or Penalty Dice'),
      expect.stringContaining('Lucy Ward . Listen . Hard . 1 Penalty Die'),
    ])
    expect(within(items[0]).getByText('Something moves upstairs.')).toHaveClass('line-clamp-1')
    expect(within(items[0]).getByRole('time')).toHaveAttribute('datetime', '2026-11-12T19:21:00Z')
  })

  it('rolls on "Roll for {name}": the row leaves, the status names the result, and focus moves to the next row (RR-UX-7)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Spot Hidden for Harvey Walters' }))
    const rollingButton = screen.getByRole('button', { name: 'Roll Spot Hidden for Harvey Walters' })
    expect(rollingButton).toBeDisabled()
    expect(rollingButton).toHaveTextContent('Rolling...')

    await act(async () => {
      getCallbacks().onSuccess(rolledHarvey)
    })
    rerenderWith([requests[1]])
    expect(screen.getByRole('status')).toHaveTextContent('Harvey Walters rolled 25 for Spot Hidden: Hard success.')
    expect(screen.getByRole('button', { name: 'Roll Listen for Lucy Ward' })).toHaveFocus()
    expect(screen.queryByText(/Harvey Walters \. Spot Hidden/)).not.toBeInTheDocument()
  })

  it('says the roll was already made on a 409 and moves focus on (RR-UX-7)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Spot Hidden for Harvey Walters' }))
    await act(async () => {
      getCallbacks().onError(new AlreadyRolledError())
    })
    rerenderWith([requests[1]])

    expect(screen.getByRole('status')).toHaveTextContent("Harvey Walters's Spot Hidden roll was already made.")
    expect(screen.getByRole('button', { name: 'Roll Listen for Lucy Ward' })).toHaveFocus()
  })

  it('keeps the row with an inline error on a network failure (RR-UX-7)', async () => {
    setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Spot Hidden for Harvey Walters' }))
    await act(async () => {
      getCallbacks().onError(new Error('offline'))
    })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't roll that. Try again.")
    expect(screen.getByRole('button', { name: 'Roll Spot Hidden for Harvey Walters' })).toBeEnabled()
  })

  it('says "No rolls waiting." when empty (RR-UX-7)', () => {
    setup([])

    expect(screen.getByText('No rolls waiting.')).toBeInTheDocument()
  })

  it('cancels on "Cancel": the row leaves, the status names the cancelled roll, and focus moves on (RR-UX-20, RR-A11Y-15)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureCancel()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Spot Hidden roll for Harvey Walters' }))
    expect(screen.getByRole('button', { name: 'Cancel Spot Hidden roll for Harvey Walters' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel Spot Hidden roll for Harvey Walters' })).toHaveTextContent('Cancelling...')
    expect(screen.getByRole('button', { name: 'Roll Spot Hidden for Harvey Walters' })).toBeDisabled()

    await act(async () => {
      getCallbacks().onSuccess()
    })
    rerenderWith([requests[1]])
    expect(screen.getByRole('status')).toHaveTextContent("Harvey Walters's Spot Hidden roll was cancelled.")
    expect(screen.getByRole('button', { name: 'Roll Listen for Lucy Ward' })).toHaveFocus()
    expect(screen.queryByText(/Harvey Walters \. Spot Hidden/)).not.toBeInTheDocument()
  })

  it('says the roll was already cancelled on a 409 and moves focus on (RR-UX-20)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureCancel()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Spot Hidden roll for Harvey Walters' }))
    await act(async () => {
      getCallbacks().onError(new RequestedRollCancelledError())
    })
    rerenderWith([requests[1]])

    expect(screen.getByRole('status')).toHaveTextContent("Harvey Walters's Spot Hidden roll was already cancelled.")
    expect(screen.getByRole('button', { name: 'Roll Listen for Lucy Ward' })).toHaveFocus()
  })

  it('says the roll was already made when a cancel loses the race (RR-UX-20)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureCancel()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Spot Hidden roll for Harvey Walters' }))
    await act(async () => {
      getCallbacks().onError(new AlreadyRolledError())
    })
    rerenderWith([requests[1]])

    expect(screen.getByRole('status')).toHaveTextContent("Harvey Walters's Spot Hidden roll was already made.")
  })

  it('keeps the row with an inline error when the cancel fails (RR-UX-20)', async () => {
    setup()
    const getCallbacks = captureCancel()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Spot Hidden roll for Harvey Walters' }))
    await act(async () => {
      getCallbacks().onError(new Error('offline'))
    })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't cancel that. Try again.")
    expect(screen.getByRole('button', { name: 'Cancel Spot Hidden roll for Harvey Walters' })).toBeEnabled()
  })

  it('says the roll was cancelled when "Roll for" loses the race to a cancel (RR-UX-20)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Spot Hidden for Harvey Walters' }))
    await act(async () => {
      getCallbacks().onError(new RequestedRollCancelledError())
    })
    rerenderWith([requests[1]])

    expect(screen.getByRole('status')).toHaveTextContent("Harvey Walters's Spot Hidden roll was cancelled.")
  })
})
