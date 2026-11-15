import type { Meta, StoryObj } from '@storybook/react-vite'

import { rollRequestQueryKeys } from '@/roll-requests/services/rollRequestApi'
import type { PushableRolls, WaitingRequestedRoll, WaitingRolls } from '@/roll-requests/types/RollRequest'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { WaitingRollsPanel } from './waiting-rolls-panel'

// specs/roll-requests/ux.md section 6.
function mineRoll(rollRequestId: string, skill: string, createdAt: string): WaitingRequestedRoll {
  return {
    rollRequestId,
    target: { kind: 'Skill', skill, specialization: null, characteristic: null },
    message: 'A creak on the stairs.',
    createdAt,
    roll: {
      investigatorId: 'i1',
      investigatorName: 'Harvey Walters',
      targetValue: 45,
      usesBaseValue: false,
      canEarnExperienceCheck: true,
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      status: 'Waiting',
      pushJustification: null,
      pushBonusDice: null,
      pushPenaltyDice: null,
      canBePushed: false,
      rolls: [],
    },
  }
}

function PanelStory({ mine, pushable }: { mine: WaitingRolls; pushable?: PushableRolls }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(rollRequestQueryKeys.mine('story-campaign'), mine)
          client.setQueryData(rollRequestQueryKeys.pushable('story-campaign'), pushable ?? { investigatorName: 'Harvey Walters', rolls: [] })
        }}
      >
        <WaitingRollsPanel campaignId="story-campaign" />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'RollRequests/WaitingRollsPanel',
  component: PanelStory,
} satisfies Meta<typeof PanelStory>

export default meta
type Story = StoryObj<typeof meta>

export const Waiting: Story = {
  args: { mine: { investigatorName: 'Harvey Walters', rolls: [mineRoll('r1', 'Listen', '2026-11-12T19:21:00Z')] } },
}

export const AmbiguousTargets: Story = {
  args: {
    mine: {
      investigatorName: 'Harvey Walters',
      rolls: [mineRoll('r1', 'Listen', '2026-11-12T19:21:00Z'), mineRoll('r2', 'Listen', '2026-11-12T19:25:00Z')],
    },
  },
}

const failedListen: WaitingRequestedRoll = {
  rollRequestId: 'r3',
  target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
  message: 'A creak on the stairs.',
  createdAt: '2026-11-12T19:21:00Z',
  roll: {
    investigatorId: 'harvey',
    investigatorName: 'Harvey Walters',
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: true,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Rolled',
    pushJustification: null,
    pushBonusDice: null,
    pushPenaltyDice: null,
    canBePushed: true,
    rolls: [
      {
        dice: '1D100',
        result: 81,
        faces: [80, 1],
        rolledBy: 'Harvey Walters',
        rolledAt: '2026-11-12T19:22:00Z',
        percentile: { unitsFace: 1, tensFaces: [80], keptTens: 80, result: 81, successLevel: 'Failure', isSuccess: false },
        earnsExperienceCheck: false,
        isPushed: false,
      },
    ],
  },
}

export const RollsYouCanPush: Story = {
  args: {
    mine: { investigatorName: 'Harvey Walters', rolls: [] },
    pushable: { investigatorName: 'Harvey Walters', rolls: [failedListen] },
  },
}

export const PushAsked: Story = {
  args: {
    mine: { investigatorName: 'Harvey Walters', rolls: [] },
    pushable: {
      investigatorName: 'Harvey Walters',
      rolls: [{ ...failedListen, roll: { ...failedListen.roll, status: 'PushAsked', pushJustification: 'I search every shelf.', canBePushed: false } }],
    },
  },
}

export const PushedWaiting: Story = {
  args: {
    mine: {
      investigatorName: 'Harvey Walters',
      rolls: [{ ...failedListen, roll: { ...failedListen.roll, status: 'Pushed', pushJustification: 'I search every shelf.', pushBonusDice: 1, pushPenaltyDice: 0 } }],
    },
  },
}
