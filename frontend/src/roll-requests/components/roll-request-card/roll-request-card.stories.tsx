import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { rollRequestQueryKeys } from '@/roll-requests/services/rollRequestApi'
import type { RollRequest } from '@/roll-requests/types/RollRequest'

import { RollRequestCard } from './roll-request-card'

const waiting = {
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
} as const

const rolled = {
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
} as const

function requestWith(rolls: readonly unknown[], visibility: RollRequest['visibility'] = 'Public'): RollRequest {
  return {
    id: 'r1',
    target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
    message: 'Something moves upstairs.',
    visibility,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt: '2026-11-12T19:21:00Z',
    requestedRolls: rolls as RollRequest['requestedRolls'],
  }
}

function hosted(request: RollRequest | undefined, isError = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (request !== undefined) {
    queryClient.setQueryData(rollRequestQueryKeys.detail('c1', 'r1'), request)
  }
  if (isError) {
    queryClient.setQueryDefaults(rollRequestQueryKeys.detail('c1', 'r1'), { queryFn: async () => Promise.reject(new Error('offline')) })
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RollRequestCard campaignId="c1" rollRequestId="r1" requestedByDisplayName="Eleanor Hart" />
    </QueryClientProvider>
  )
}

const meta: Meta<typeof RollRequestCard> = {
  component: RollRequestCard,
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof RollRequestCard>

export const Waiting: Story = { render: () => hosted(requestWith([waiting])) }

export const RolledSuccessWithCheck: Story = { render: () => hosted(requestWith([rolled])) }

export const Failure: Story = {
  render: () =>
    hosted(
      requestWith([
        {
          ...rolled,
          status: 'Rolled',
          rolls: [{ ...rolled.rolls[0], result: 95, percentile: { ...rolled.rolls[0].percentile, result: 95, successLevel: 'Failure', isSuccess: false }, earnsExperienceCheck: false }],
        },
      ]),
    ),
}

export const PenaltyDieWithTwoTens: Story = {
  render: () =>
    hosted(
      requestWith([
        {
          ...rolled,
          difficulty: 'Hard',
          penaltyDice: 2,
          rolls: [{ ...rolled.rolls[0], percentile: { ...rolled.rolls[0].percentile, tensFaces: [80, 20], keptTens: 20 } }],
        },
      ]),
    ),
}

export const Hidden: Story = {
  render: () => hosted(requestWith([{ ...rolled, rolls: [{ ...rolled.rolls[0], rolledBy: 'The Keeper' }] }], 'KeeperOnly')),
}

export const Cancelled: Story = { render: () => hosted(requestWith([{ ...waiting, status: 'Cancelled' }])) }

const failedPush = {
  ...rolled,
  status: 'Rolled',
  pushJustification: 'I search every shelf.',
  canBePushed: false,
  rolls: [
    {
      dice: '1D100',
      result: 81,
      faces: [80, 1],
      rolledBy: 'Harvey Walters',
      rolledAt: '2026-11-15T19:14:00Z',
      percentile: { unitsFace: 1, tensFaces: [80], keptTens: 80, result: 81, successLevel: 'Failure', isSuccess: false },
      earnsExperienceCheck: false,
      isPushed: false,
    },
  ],
} as const

const pushedRollRecord = {
  ...failedPush.rolls[0],
  result: 15,
  faces: [10, 5],
  percentile: { unitsFace: 5, tensFaces: [10], keptTens: 10, result: 15, successLevel: 'Hard', isSuccess: true },
  isPushed: true,
} as const

export const PushAsked: Story = { render: () => hosted(requestWith([{ ...failedPush, status: 'PushAsked' }])) }

export const Pushed: Story = {
  render: () => hosted(requestWith([{ ...failedPush, status: 'Pushed', pushBonusDice: 1, pushPenaltyDice: 0 }])),
}

export const PushedRolled: Story = {
  render: () => hosted(requestWith([{ ...failedPush, pushBonusDice: 1, pushPenaltyDice: 0, rolls: [failedPush.rolls[0], pushedRollRecord] }])),
}

export const PushDeclined: Story = { render: () => hosted(requestWith([failedPush])) }

export const CancelledAfterPush: Story = { render: () => hosted(requestWith([{ ...failedPush, status: 'Cancelled' }])) }

export const Loading: Story = { render: () => hosted(undefined) }

export const LoadError: Story = { render: () => hosted(undefined, true) }
