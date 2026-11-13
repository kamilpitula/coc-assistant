import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'

import { RollRequestCard } from './roll-request-card'

// specs/roll-requests/ux.md section 5; RR-UX-10, RR-UX-11, RR-A11Y-6, RR-A11Y-7.
const { mockUseRollRequest } = vi.hoisted(() => ({ mockUseRollRequest: vi.fn() }))

vi.mock('@/roll-requests/hooks/useRollRequests', () => ({ useRollRequest: mockUseRollRequest }))

function rolledRoll(overrides: Partial<RequestedRoll> = {}): RequestedRoll {
  return {
    investigatorId: 'i1',
    investigatorName: 'Harvey Walters',
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: true,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Rolled',
    rolls: [
      {
        dice: '1d100',
        result: 25,
        faces: [20, 5],
        rolledBy: 'Ana Duarte',
        rolledAt: '2026-11-12T19:22:00Z',
        percentile: { unitsFace: 5, tensFaces: [20], keptTens: 20, result: 25, successLevel: 'Hard', isSuccess: true },
        earnsExperienceCheck: true,
      },
    ],
    ...overrides,
  }
}

function waitingRoll(overrides: Partial<RequestedRoll> = {}): RequestedRoll {
  return {
    investigatorId: 'i2',
    investigatorName: 'Lucy Ward',
    targetValue: 45,
    usesBaseValue: true,
    canEarnExperienceCheck: true,
    difficulty: 'Hard',
    bonusDice: 0,
    penaltyDice: 1,
    status: 'Waiting',
    rolls: [],
    ...overrides,
  }
}

const request: RollRequest = {
  id: 'r1',
  target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
  message: 'Something moves upstairs.',
  visibility: 'Public',
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 0,
  createdAt: '2026-11-12T19:21:00Z',
  requestedRolls: [rolledRoll(), waitingRoll()],
}

function loaded() {
  mockUseRollRequest.mockReturnValue({ data: request, isPending: false, isError: false, refetch: vi.fn() })
  render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)
}

describe('RollRequestCard', () => {
  it('renders the request as an article labelled "{target} roll" with time, requester, and message (RR-UX-10, RR-A11Y-7)', () => {
    loaded()

    const article = screen.getByRole('article', { name: 'Spot Hidden roll' })
    expect(within(article).getByRole('heading', { level: 3, name: 'Spot Hidden roll' })).toBeInTheDocument()
    expect(within(article).getByText('Eleanor Hart')).toBeInTheDocument()
    expect(within(article).getByText('Something moves upstairs.')).toBeInTheDocument()
    expect(within(article).getByRole('list')).toBeInTheDocument()
  })

  it('shows a rolled row with outcome, targets, faces, roller, and the experience check (RR-UX-10, RR-UX-11)', () => {
    loaded()

    const article = screen.getByRole('article', { name: 'Spot Hidden roll' })
    const row = within(article).getByText('Harvey Walters').closest('li') as HTMLElement
    expect(within(row).getByText('25: Hard success')).toBeInTheDocument()
    expect(within(row).getByText('Regular . no Bonus or Penalty Dice . target 60 / 30 / 12')).toBeInTheDocument()
    expect(within(row).getByText('Tens 20, units 5 = 25')).toBeInTheDocument()
    expect(within(row).getByText('Rolled by Ana Duarte')).toBeInTheDocument()
    expect(within(row).getByText('Experience check earned')).toBeInTheDocument()
  })

  it('shows a Waiting row with targets and the base value mark, and no roller or check (RR-UX-10)', () => {
    loaded()

    const article = screen.getByRole('article', { name: 'Spot Hidden roll' })
    const row = within(article).getByText('Lucy Ward').closest('li') as HTMLElement
    expect(within(row).getByText('Waiting')).toBeInTheDocument()
    expect(within(row).getByText('Hard . 1 Penalty Die . target 45 / 22 / 9 (base value)')).toBeInTheDocument()
    expect(within(row).queryByText(/Rolled by/)).not.toBeInTheDocument()
    expect(within(row).queryByText('Experience check earned')).not.toBeInTheDocument()
  })

  it('reads two tens dice with the kept result, and never shows Remove (RR-UX-10)', () => {
    mockUseRollRequest.mockReturnValue({
      data: { ...request, requestedRolls: [rolledRoll({ rolls: [{ ...rolledRoll().rolls[0], percentile: { ...rolledRoll().rolls[0].percentile!, tensFaces: [80, 20], keptTens: 20 } }] })] },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)

    expect(screen.getByText('Tens 80 and 20, units 5 - kept 25')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })

  it('names Failure and Fumble without an outcome level (RR-UX-10)', () => {
    mockUseRollRequest.mockReturnValue({
      data: {
        ...request,
        requestedRolls: [
          rolledRoll({ rolls: [{ ...rolledRoll().rolls[0], result: 95, percentile: { ...rolledRoll().rolls[0].percentile!, result: 95, successLevel: 'Failure', isSuccess: false }, earnsExperienceCheck: false }] }),
          rolledRoll({ investigatorId: 'i3', investigatorName: 'Cy Holloway', rolls: [{ ...rolledRoll().rolls[0], result: 100, percentile: { ...rolledRoll().rolls[0].percentile!, tensFaces: [0, 0], result: 100, successLevel: 'Fumble', isSuccess: false }, earnsExperienceCheck: false }] }),
        ],
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)

    expect(screen.getByText('95: Failure')).toBeInTheDocument()
    expect(screen.getByText('100: Fumble')).toBeInTheDocument()
    expect(screen.queryByText('Experience check earned')).not.toBeInTheDocument()
  })

  it('marks a hidden card with "Keeper only" and "(hidden roll)" on every row (RR-UX-18, RR-A11Y-14)', () => {
    mockUseRollRequest.mockReturnValue({
      data: { ...request, visibility: 'KeeperOnly', requestedRolls: [rolledRoll()] },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)

    const article = screen.getByRole('article', { name: 'Spot Hidden roll' })
    expect(within(article).getByText('Keeper only')).toBeInTheDocument()
    expect(within(article).getByText('Rolled by Ana Duarte (hidden roll)')).toBeInTheDocument()
  })

  it('shows no Keeper-only marks on a Public card (RR-UX-18)', () => {
    loaded()

    expect(screen.queryByText('Keeper only')).not.toBeInTheDocument()
    expect(screen.queryByText(/\(hidden roll\)/)).not.toBeInTheDocument()
  })

  it('shows no check line for a rolled Luck row (RR-UX-11)', () => {
    mockUseRollRequest.mockReturnValue({
      data: {
        ...request,
        target: { kind: 'Luck', skill: null, specialization: null, characteristic: null },
        requestedRolls: [rolledRoll({ targetValue: 60, difficulty: 'Regular', canEarnExperienceCheck: false, rolls: [{ ...rolledRoll().rolls[0], earnsExperienceCheck: false }] })],
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })
    render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)

    expect(screen.getByRole('article', { name: 'Luck roll' })).toBeInTheDocument()
    expect(screen.getByText('Regular . no Bonus or Penalty Dice . target 60 / 30 / 12')).toBeInTheDocument()
    expect(screen.queryByText('Experience check earned')).not.toBeInTheDocument()
  })

  it('shows a busy skeleton while loading (RR-A11Y-7)', () => {
    mockUseRollRequest.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() })
    render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('shows "We couldn\'t load this roll." with "Try again" on error', async () => {
    const refetch = vi.fn()
    mockUseRollRequest.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch })
    render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)

    expect(screen.getByText("We couldn't load this roll.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('renders nothing when the read answers 404', () => {
    mockUseRollRequest.mockReturnValue({ data: null, isPending: false, isError: false, refetch: vi.fn() })
    const { container } = render(<RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />)

    expect(container).toBeEmptyDOMElement()
  })
})
