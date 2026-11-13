import type { Meta, StoryObj } from '@storybook/react-vite'

import { rollRequestQueryKeys } from '@/roll-requests/services/rollRequestApi'
import type { RollRequest } from '@/roll-requests/types/RollRequest'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { WaitingRolls } from './waiting-rolls'

// specs/roll-requests/ux.md section 4.
function waitingRoll(investigatorId: string, investigatorName: string) {
  return {
    investigatorId,
    investigatorName,
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: true,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status: 'Waiting',
    rolls: [],
  }
}

function requestWith(id: string, skill: string, rolls: unknown[]): RollRequest {
  return {
    id,
    target: { kind: 'Skill', skill, specialization: null, characteristic: null },
    message: 'Something moves upstairs.',
    visibility: 'Public',
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt: '2026-11-12T19:21:00Z',
    requestedRolls: rolls as RollRequest['requestedRolls'],
  }
}

function ListStory({ requests }: { requests: RollRequest[] }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders seed={(client) => client.setQueryData(rollRequestQueryKeys.activeScene('story-campaign'), requests)}>
        <WaitingRolls campaignId="story-campaign" />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'RollRequests/WaitingRolls',
  component: ListStory,
} satisfies Meta<typeof ListStory>

export default meta
type Story = StoryObj<typeof meta>

export const Waiting: Story = {
  args: {
    requests: [
      requestWith('r1', 'Spot Hidden', [waitingRoll('i1', 'Harvey Walters')]),
      requestWith('r2', 'Listen', [waitingRoll('i2', 'Lucy Ward')]),
    ],
  },
}

export const Empty: Story = { args: { requests: [] } }
