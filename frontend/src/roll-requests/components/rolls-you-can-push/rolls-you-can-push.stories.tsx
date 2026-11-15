import type { Meta, StoryObj } from '@storybook/react-vite'

import type { WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RollsYouCanPush } from './rolls-you-can-push'

// specs/roll-requests/ux.md section 19.1.
function pushableRow(rollRequestId: string, skill: string, status: 'Rolled' | 'PushAsked'): WaitingRequestedRoll {
  return {
    rollRequestId,
    target: { kind: 'Skill', skill, specialization: null, characteristic: null },
    message: 'A creak on the stairs.',
    createdAt: '2026-11-15T19:14:00Z',
    roll: {
      investigatorId: 'harvey',
      investigatorName: 'Harvey Walters',
      targetValue: 60,
      usesBaseValue: false,
      canEarnExperienceCheck: true,
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      status,
      pushJustification: status === 'PushAsked' ? 'I search every shelf.' : null,
      pushBonusDice: null,
      pushPenaltyDice: null,
      canBePushed: status === 'Rolled',
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
    },
  }
}

function GroupStory({ pushable }: { pushable: WaitingRequestedRoll[] }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders>
        <RollsYouCanPush
          campaignId="story-campaign"
          investigatorName="Harvey Walters"
          pushable={pushable}
          headingRef={{ current: null }}
          onAsked={() => undefined}
          onUnpushable={() => undefined}
        />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'RollRequests/RollsYouCanPush',
  component: GroupStory,
} satisfies Meta<typeof GroupStory>

export default meta
type Story = StoryObj<typeof meta>

export const CanPush: Story = {
  args: { pushable: [pushableRow('r1', 'Spot Hidden', 'Rolled'), pushableRow('r2', 'Listen', 'Rolled')] },
}

export const PushAsked: Story = {
  args: { pushable: [pushableRow('r1', 'Spot Hidden', 'PushAsked')] },
}

export const AmbiguousTargets: Story = {
  args: { pushable: [pushableRow('r1', 'Listen', 'Rolled'), pushableRow('r2', 'Listen', 'Rolled')] },
}
