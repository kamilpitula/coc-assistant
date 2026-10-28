import type { Meta, StoryObj } from '@storybook/react-vite'

import { STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ActiveSceneCard } from './active-scene-card'

const keeperScene: ActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-a', name: 'Harvey Walters' }, { id: 'i-c', name: 'Lucy Ward' }],
  reveals: [],
}

interface StoryArgs {
  isKeeper?: boolean
  scene?: ActiveScene | 'error'
}

function CardStory({ isKeeper = true, scene = keeperScene }: StoryArgs) {
  return (
    <StoryMsal tokens={scene === 'error' ? 'failing' : 'pending'}>
      <StoryProviders seed={(client) => scene !== 'error' && client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), scene)}>
        <ActiveSceneCard campaignId={STORY_CAMPAIGN_ID} isKeeper={isKeeper} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ActiveSceneCard',
  component: CardStory,
} satisfies Meta<typeof CardStory>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = {}

export const PresentPlayer: Story = {
  args: {
    isKeeper: false,
    scene: {
      kind: 'present-player',
      title: 'The Corbitt House',
      location: 'Arkham, Boston Road',
      investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }, { name: 'Lucy Ward', isYours: false }],
    },
  },
}

export const NotPresentPlayer: Story = { args: { isKeeper: false, scene: { kind: 'absent-player', title: 'The Corbitt House' } } }

export const ErrorState: Story = { args: { scene: 'error' } }
