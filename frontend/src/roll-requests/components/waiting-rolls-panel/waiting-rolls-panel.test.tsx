import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import { formatWallEntryTime } from '@/campaign-play/services/wallEntryTime'
import { AlreadyRolledError, RequestedRollCancelledError, RequestedRollGoneError } from '@/roll-requests/services/rollRequestApi'
import type { RequestedRoll, WaitingRequestedRoll, WaitingRolls } from '@/roll-requests/types/RollRequest'

import { WaitingRollsPanel } from './waiting-rolls-panel'

// specs/roll-requests/ux.md section 6; RR-UX-8, RR-UX-9, RR-A11Y-3.
const { mockUseMyRequestedRolls, mockMutate } = vi.hoisted(() => ({ mockUseMyRequestedRolls: vi.fn(), mockMutate: vi.fn() }))

vi.mock('@/roll-requests/hooks/useRollRequests', () => ({
  useMyRequestedRolls: mockUseMyRequestedRolls,
  useRollRequestedRoll: () => ({ mutate: mockMutate, isPending: false }),
}))

interface RollCallbacks {
  onSuccess: (result: RequestedRoll) => void
  onError: (error: Error) => void
}

function waitingRoll(overrides: Partial<RequestedRoll> = {}): RequestedRoll {
  return {
    investigatorId: 'i1',
    investigatorName: 'Harvey Walters',
    targetValue: 45,
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

function mineRoll(overrides: Partial<WaitingRequestedRoll> = {}): WaitingRequestedRoll {
  return {
    rollRequestId: 'r1',
    target: { kind: 'Skill', skill: 'Listen', specialization: null, characteristic: null },
    message: 'A creak on the stairs.',
    createdAt: '2026-11-12T19:21:00Z',
    roll: waitingRoll(),
    ...overrides,
  }
}

const mine: WaitingRolls = { investigatorName: 'Harvey Walters', rolls: [mineRoll()] }

function rolled(overrides: Partial<RequestedRoll> = {}): RequestedRoll {
  return {
    ...waitingRoll(),
    status: 'Rolled',
    rolls: [
      {
        dice: '1d100',
        result: 25,
        faces: [20, 5],
        rolledBy: 'Harvey Walters',
        rolledAt: '2026-11-12T19:22:00Z',
        percentile: { unitsFace: 5, tensFaces: [20], keptTens: 20, result: 25, successLevel: 'Hard', isSuccess: true },
        earnsExperienceCheck: true,
      },
    ],
    ...overrides,
  }
}

function setup(data: WaitingRolls | null | undefined = mine) {
  mockUseMyRequestedRolls.mockReturnValue({ data, isPending: data === undefined, isError: false, refetch: vi.fn() })
  mockMutate.mockReset()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const view = render(<WaitingRollsPanel campaignId="c1" />, { wrapper })
  return { ...view, rerenderWith: (next: WaitingRolls | null | undefined) => {
    mockUseMyRequestedRolls.mockReturnValue({ data: next, isPending: next === undefined, isError: false, refetch: vi.fn() })
    view.rerender(<WaitingRollsPanel campaignId="c1" />)
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

describe('WaitingRollsPanel', () => {
  it('lists the rolls oldest first with target, dice, the quoted message, and one "Roll {target}" each (RR-UX-8)', () => {
    setup()

    expect(screen.getByRole('heading', { level: 2, name: 'Rolls waiting for you, 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 }).querySelector('.sr-only')).toHaveTextContent(', 1')
    const item = screen.getByRole('listitem')
    expect(item.textContent).toContain('Listen . Regular . no Bonus or Penalty Dice')
    expect(within(item).getByText('"A creak on the stairs."')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Listen' })).toHaveTextContent('Roll Listen')
  })

  it('names each button with the request time when two rows share a target (RR-A11Y-3)', () => {
    setup({ ...mine, rolls: [mineRoll(), mineRoll({ rollRequestId: 'r2', createdAt: '2026-11-12T19:25:00Z' })] })

    expect(screen.getByRole('button', { name: `Roll Listen, requested ${formatWallEntryTime('2026-11-12T19:21:00Z', new Date()).text}` })).toHaveTextContent('Roll Listen')
    expect(screen.getByRole('button', { name: `Roll Listen, requested ${formatWallEntryTime('2026-11-12T19:25:00Z', new Date()).text}` })).toHaveTextContent('Roll Listen')
  })

  it('rolls from the panel: the row leaves, the status names the result and the check, and focus moves to it (RR-UX-9)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    const rollingButton = screen.getByRole('button')
    expect(rollingButton).toBeDisabled()
    expect(rollingButton).toHaveTextContent('Rolling...')

    await act(async () => {
      getCallbacks().onSuccess(rolled())
    })
    rerenderWith({ ...mine, rolls: [] })

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('You rolled 25: Hard success. Experience check earned.')
    expect(status).toHaveFocus()
  })

  it('shows the result in its own "Your last roll" subsection, visually separated from the queue', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    await act(async () => {
      getCallbacks().onSuccess(rolled())
    })
    rerenderWith({ ...mine, rolls: [] })

    const subsection = screen.getByRole('region', { name: 'Your last roll' })
    expect(within(subsection).getByRole('heading', { level: 3, name: 'Your last roll' })).toBeInTheDocument()
    expect(within(subsection).getByRole('status')).toHaveTextContent('You rolled 25: Hard success.')
  })

  it('names a failure without the check line (RR-UX-9)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()
    const failure = rolled({
      rolls: [{
        dice: '1d100',
        result: 95,
        faces: [90, 5],
        rolledBy: 'Harvey Walters',
        rolledAt: '2026-11-12T19:22:00Z',
        percentile: { unitsFace: 5, tensFaces: [90], keptTens: 90, result: 95, successLevel: 'Failure', isSuccess: false },
        earnsExperienceCheck: false,
      }],
    })

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    await act(async () => {
      getCallbacks().onSuccess(failure)
    })
    rerenderWith({ ...mine, rolls: [] })

    expect(screen.getByRole('status')).toHaveTextContent('You rolled 95: Failure.')
    expect(screen.getByRole('status')).not.toHaveTextContent('Experience check earned.')
  })

  it('says the Keeper already made the roll on a 409 and moves focus to the status (RR-UX-9)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    await act(async () => {
      getCallbacks().onError(new AlreadyRolledError())
    })
    rerenderWith({ ...mine, rolls: [] })

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Your Listen roll was already made by the Keeper.')
    expect(status).toHaveFocus()
  })

  it('leaves the panel without a message when the roll is gone (404)', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    await act(async () => {
      getCallbacks().onError(new RequestedRollGoneError())
    })
    rerenderWith({ ...mine, rolls: [] })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Rolls waiting for you/ })).not.toBeInTheDocument()
  })

  it('leaves the panel without a message when the Scene is no longer Active', async () => {
    const { rerenderWith } = setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    await act(async () => {
      getCallbacks().onError(new NoActiveSceneError())
    })
    rerenderWith({ ...mine, rolls: [] })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Rolls waiting for you/ })).not.toBeInTheDocument()
  })

  it('keeps the row with an inline error on a network failure', async () => {
    setup()
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    await act(async () => {
      getCallbacks().onError(new Error('offline'))
    })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't roll that. Try again.")
    expect(screen.getByRole('button', { name: 'Roll Listen' })).toBeEnabled()
  })

  it('renders nothing without rolls and without a status from this tab', () => {
    const { container } = setup({ ...mine, rolls: [] })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing without an Approved Investigator', () => {
    const { container } = setup(null)

    expect(container).toBeEmptyDOMElement()
  })

  it('leaves the panel silently and moves focus to its heading when the roll was cancelled (RR-UX-22, RR-A11Y-16)', async () => {
    const both = { ...mine, rolls: [mineRoll(), mineRoll({ rollRequestId: 'r2' })] }
    const { rerenderWith } = setup(both)
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getAllByRole('button', { name: /Roll Listen/ })[0])
    await act(async () => {
      getCallbacks().onError(new RequestedRollCancelledError())
    })
    rerenderWith({ ...mine, rolls: [mineRoll({ rollRequestId: 'r2' })] })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Rolls waiting for you, 1' })).toHaveFocus()
  })

  it('moves focus to the page h1 when the last row is cancelled (RR-A11Y-16)', async () => {
    mockUseMyRequestedRolls.mockReturnValue({ data: mine, isPending: false, isError: false, refetch: vi.fn() })
    mockMutate.mockReset()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const view = render(
      <main>
        <h1 tabIndex={-1}>The Corbitt House</h1>
        <QueryClientProvider client={queryClient}>
          <WaitingRollsPanel campaignId="c1" />
        </QueryClientProvider>
      </main>,
    )
    const getCallbacks = captureRoll()

    await userEvent.click(screen.getByRole('button', { name: 'Roll Listen' }))
    await act(async () => {
      getCallbacks().onError(new RequestedRollCancelledError())
    })
    mockUseMyRequestedRolls.mockReturnValue({ data: { ...mine, rolls: [] }, isPending: false, isError: false, refetch: vi.fn() })
    view.rerender(
      <main>
        <h1 tabIndex={-1}>The Corbitt House</h1>
        <QueryClientProvider client={queryClient}>
          <WaitingRollsPanel campaignId="c1" />
        </QueryClientProvider>
      </main>,
    )

    expect(screen.queryByRole('heading', { name: /Rolls waiting for you/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toHaveFocus()
  })
})
