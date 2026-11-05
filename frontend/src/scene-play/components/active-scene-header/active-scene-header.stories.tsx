import type { Meta, StoryObj } from '@storybook/react-vite'

import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ActiveSceneHeader } from './active-scene-header'

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-a', name: 'Dr. Ames' }],
  reveals: [],
}

function HeaderStory({ compact = false }: { compact?: boolean }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders>
        <ActiveSceneHeader
          campaignId="story-campaign"
          scene={scene}
          compact={compact}
          headingRef={{ current: null }}
          onFinished={() => undefined}
          onAlreadyFinished={() => undefined}
        />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ActiveSceneHeader',
  component: HeaderStory,
} satisfies Meta<typeof HeaderStory>

export default meta
type Story = StoryObj<typeof meta>

export const Run: Story = {}

export const Compact: Story = { args: { compact: true } }
