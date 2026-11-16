import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'

import { PushRulingRow } from './push-ruling-row'

// specs/roll-requests/ux.md section 19.2.
const roll: RequestedRoll = {
  investigatorId: 'harvey',
  investigatorName: 'Harvey Walters',
  targetValue: 60,
  usesBaseValue: false,
  canEarnExperienceCheck: true,
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 1,
  status: 'PushAsked',
  pushJustification: 'I search every shelf through the night.',
  pushBonusDice: null,
  pushPenaltyDice: null,
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
}

const request: RollRequest = {
  id: 'r1',
  target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
  message: 'Something moves upstairs.',
  visibility: 'Public',
  difficulty: 'Regular',
  bonusDice: 0,
  penaltyDice: 0,
  createdAt: '2026-11-15T19:14:00Z',
  requestedRolls: [roll],
}

const meta = {
  title: 'RollRequests/PushRulingRow',
  component: PushRulingRow,
  args: {
    request,
    roll,
    busy: false,
    approving: false,
    declining: false,
    failed: null,
    onApprove: () => undefined,
    onDecline: () => undefined,
  },
} satisfies Meta<typeof PushRulingRow>

export default meta
type Story = StoryObj<typeof meta>

export const PushAsked: Story = {}

export const Approving: Story = { args: { busy: true, approving: true } }

export const Declining: Story = { args: { busy: true, declining: true } }

export const ApproveFailed: Story = { args: { failed: 'approve' } }
