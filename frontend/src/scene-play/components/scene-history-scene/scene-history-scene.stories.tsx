import type { Meta, StoryObj } from '@storybook/react-vite'

import { keeperReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperHistoryScene, PlayerHistoryScene } from '@/scene-play/types/SceneHistory'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneHistoryScene } from './scene-history-scene'

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
}

const keeperFinished: KeeperHistoryScene = {
  ...keeperActive,
  sceneId: 'story-finished',
  title: 'Meeting Knott',
  finishedAt: '2026-11-07T21:00:00Z',
}

const playerFinished: PlayerHistoryScene = {
  sceneId: 'story-finished',
  scenarioTitle: 'The Haunting',
  title: 'Meeting Knott',
  startedAt: '2026-10-31T19:10:00Z',
  finishedAt: '2026-10-31T21:00:00Z',
  reveals: [textReveal],
}

interface SceneStoryArgs {
  viewer?: 'keeper' | 'player' | 'without-investigator'
  finished?: boolean
  empty?: boolean
  unnamed?: boolean
}

function keeperSceneStory(finished: boolean, empty: boolean, unnamed: boolean): KeeperHistoryScene {
  return {
    ...(finished ? keeperFinished : keeperActive),
    reveals: empty ? [] : keeperActive.reveals,
    investigatorsPresent: unnamed ? [{ id: 'i-harvey', name: null }] : keeperActive.investigatorsPresent,
  }
}

function playerSceneStory(viewer: 'player' | 'without-investigator', empty: boolean): { scene: PlayerHistoryScene; investigatorName: string | null } {
  return {
    scene: { ...playerFinished, reveals: empty ? [] : playerFinished.reveals },
    investigatorName: viewer === 'player' ? 'Harvey Walters' : null,
  }
}

function SceneStory({ viewer = 'keeper', finished = false, empty = false, unnamed = false }: SceneStoryArgs) {
  if (viewer === 'keeper') {
    return (
      <StoryProviders>
        <SceneHistoryScene campaignId="story-campaign" scene={keeperSceneStory(finished, empty, unnamed)} investigatorName={null} />
      </StoryProviders>
    )
  }

  const { scene, investigatorName } = playerSceneStory(viewer, empty)
  return (
    <StoryProviders>
      <SceneHistoryScene campaignId="story-campaign" scene={scene} investigatorName={investigatorName} />
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

export const PlayerFinished: Story = { args: { viewer: 'player', finished: true } }

export const PlayerEmpty: Story = { args: { viewer: 'player', finished: true, empty: true } }

export const PlayerWithoutAnInvestigator: Story = { args: { viewer: 'without-investigator', finished: true, empty: true } }
