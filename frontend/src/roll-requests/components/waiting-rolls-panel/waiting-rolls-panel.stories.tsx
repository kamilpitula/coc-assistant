import type { Meta, StoryObj } from '@storybook/react-vite'

import { rollRequestQueryKeys } from '@/roll-requests/services/rollRequestApi'
import type { WaitingRequestedRoll, WaitingRolls } from '@/roll-requests/types/RollRequest'
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
      rolls: [],
    },
  }
}

function PanelStory({ mine }: { mine: WaitingRolls }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders seed={(client) => client.setQueryData(rollRequestQueryKeys.mine('story-campaign'), mine)}>
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
