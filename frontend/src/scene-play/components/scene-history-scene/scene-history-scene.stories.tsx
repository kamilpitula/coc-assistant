import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RequestedRoll, RollRequest } from '@/roll-requests/types/RollRequest'
import { keeperReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperHistoryScene, PlayerHistoryScene } from '@/scene-play/types/SceneHistory'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneHistoryScene } from './scene-history-scene'

function waitingRoll(investigatorId: string, investigatorName: string, status: RequestedRoll['status'] = 'Waiting'): RequestedRoll {
  return {
    investigatorId,
    investigatorName,
    targetValue: 60,
    usesBaseValue: false,
    canEarnExperienceCheck: false,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    status,
    rolls: [],
  }
}

interface StoryRollChoice {
  investigatorId: string
  investigatorName: string
  status?: RequestedRoll['status']
}

function storyRequest(id: string, createdAt: string, rolls: StoryRollChoice[], visibility: RollRequest['visibility'] = 'Public'): RollRequest {
  return {
    id,
    target: { kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null },
    message: 'Something moves upstairs.',
    visibility,
    difficulty: 'Regular',
    bonusDice: 0,
    penaltyDice: 0,
    createdAt,
    requestedRolls: rolls.map((roll) => waitingRoll(roll.investigatorId, roll.investigatorName, roll.status)),
  }
}

const keeperOnlyRequest: RollRequest = {
  ...storyRequest('story-hidden', '2026-11-07T19:31:00Z', [{ investigatorId: 'i-harvey', investigatorName: 'Harvey Walters' }], 'KeeperOnly'),
  target: { kind: 'Skill', skill: 'Psychology', specialization: null, characteristic: null },
}

const keeperActive: KeeperHistoryScene = {
  sceneId: 'story-active',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  startedAt: '2026-11-07T19:05:00Z',
  finishedAt: null,
  investigatorsPresent: [
    { id: 'i-harvey', name: 'Harvey Walters' },
    { id: 'i-lucy', name: 'Lucy Ward' },
  ],
  reveals: [keeperReveal(readAloudReveal, 'h-front-door', ['Harvey Walters', 'Lucy Ward']), keeperReveal(textReveal, 'h-letter', ['Harvey Walters'])],
  rollRequests: [],
}

const keeperWithRolls: KeeperHistoryScene = {
  ...keeperActive,
  rollRequests: [
    keeperOnlyRequest,
    storyRequest('story-public', '2026-11-07T19:14:00Z', [{ investigatorId: 'i-harvey', investigatorName: 'Harvey Walters' }]),
  ],
}

const keeperFinished: KeeperHistoryScene = {
  ...keeperActive,
  sceneId: 'story-finished',
  title: 'Meeting Knott',
  finishedAt: '2026-11-07T21:00:00Z',
}

const keeperHiddenCancelledRow: KeeperHistoryScene = {
  ...keeperActive,
  reveals: [],
  rollRequests: [
    storyRequest('story-mixed', '2026-11-07T19:14:00Z', [
      { investigatorId: 'i-harvey', investigatorName: 'Harvey Walters' },
      { investigatorId: 'i-lucy', investigatorName: 'Lucy Ward', status: 'Cancelled' },
    ]),
  ],
}

const keeperCancelledOnly: KeeperHistoryScene = {
  ...keeperFinished,
  reveals: [],
  rollRequests: [
    storyRequest('story-cancelled', '2026-11-07T19:14:00Z', [
      { investigatorId: 'i-harvey', investigatorName: 'Harvey Walters', status: 'Cancelled' },
    ]),
  ],
}

const playerFinished: PlayerHistoryScene = {
  sceneId: 'story-finished',
  scenarioTitle: 'The Haunting',
  title: 'Meeting Knott',
  startedAt: '2026-10-31T19:10:00Z',
  finishedAt: '2026-10-31T21:00:00Z',
  reveals: [textReveal],
  rollRequests: [],
}

const playerWithAnotherInvestigatorsRoll: PlayerHistoryScene = {
  ...playerFinished,
  reveals: [],
  rollRequests: [
    storyRequest('story-lucy-roll', '2026-11-07T19:14:00Z', [{ investigatorId: 'i-lucy', investigatorName: 'Lucy Ward' }]),
  ],
}

interface SceneStoryArgs {
  viewer?: 'keeper' | 'player' | 'without-investigator'
  finished?: boolean
  empty?: boolean
  unnamed?: boolean
  rolls?: 'none' | 'mixed' | 'hidden-cancelled' | 'cancelled-only' | 'another-investigator'
}

function keeperSceneStory(
  finished: boolean,
  empty: boolean,
  unnamed: boolean,
  rolls: SceneStoryArgs['rolls'],
): KeeperHistoryScene {
  if (rolls === 'cancelled-only') {
    return keeperCancelledOnly
  }
  if (rolls === 'hidden-cancelled') {
    return keeperHiddenCancelledRow
  }
  return {
    ...(finished ? keeperFinished : keeperActive),
    reveals: empty ? [] : keeperActive.reveals,
    investigatorsPresent: unnamed ? [{ id: 'i-harvey', name: null }] : keeperActive.investigatorsPresent,
    rollRequests: rolls === 'mixed' ? keeperWithRolls.rollRequests : [],
  }
}

function playerSceneStory(
  viewer: 'player' | 'without-investigator',
  empty: boolean,
  rolls: SceneStoryArgs['rolls'],
): { scene: PlayerHistoryScene; investigatorName: string | null } {
  if (rolls === 'another-investigator') {
    return { scene: playerWithAnotherInvestigatorsRoll, investigatorName: 'Harvey Walters' }
  }
  return {
    scene: { ...playerFinished, reveals: empty ? [] : playerFinished.reveals },
    investigatorName: viewer === 'player' ? 'Harvey Walters' : null,
  }
}

function SceneStory({ viewer = 'keeper', finished = false, empty = false, unnamed = false, rolls = 'none' }: SceneStoryArgs) {
  if (viewer === 'keeper') {
    return (
      <StoryProviders>
        <SceneHistoryScene
          campaignId="story-campaign"
          scene={keeperSceneStory(finished, empty, unnamed, rolls)}
          investigatorName={null}
          requestedByDisplayName="Eleanor Hart"
        />
      </StoryProviders>
    )
  }

  const { scene, investigatorName } = playerSceneStory(viewer, empty, rolls)
  return (
    <StoryProviders>
      <SceneHistoryScene campaignId="story-campaign" scene={scene} investigatorName={investigatorName} requestedByDisplayName="Eleanor Hart" />
    </StoryProviders>
  )
}

const meta = {
  title: 'ScenePlay/SceneHistoryScene',
  component: SceneStory,
} satisfies Meta<typeof SceneStory>

export default meta
type Story = StoryObj<typeof meta>

export const KeeperActive: Story = {}

export const KeeperFinished: Story = { args: { finished: true } }

export const KeeperEmpty: Story = { args: { finished: true, empty: true } }

export const KeeperUnnamedPresent: Story = { args: { unnamed: true } }

export const KeeperWithMixedRolls: Story = { args: { rolls: 'mixed' } }

export const KeeperWithHiddenCancelledRow: Story = { args: { rolls: 'hidden-cancelled' } }

export const KeeperCancelledOnly: Story = { args: { rolls: 'cancelled-only' } }

export const PlayerFinished: Story = { args: { viewer: 'player', finished: true } }

export const PlayerEmpty: Story = { args: { viewer: 'player', finished: true, empty: true } }

export const PlayerSeesAnotherInvestigatorsRoll: Story = { args: { viewer: 'player', finished: true, rolls: 'another-investigator' } }

export const PlayerWithoutAnInvestigator: Story = { args: { viewer: 'without-investigator', finished: true, empty: true } }
