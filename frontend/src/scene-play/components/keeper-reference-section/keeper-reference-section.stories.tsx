import type { Meta, StoryObj } from '@storybook/react-vite'

import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { paragraph } from '@/scene-play/test-support/revealFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { KeeperReferenceSection } from './keeper-reference-section'

const active: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
  reveals: [],
}

const material: Scene = {
  id: 'story-scene',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: '2026-10-28T19:40:00Z',
  finishedAt: null,
  location: 'Arkham',
  keeperNotes: paragraph('Walter is in the cellar.'),
  itemLinks: [],
  nonPlayerEntityLinks: [
    {
      id: 'l1',
      nonPlayerEntity: { id: 'n1', type: 'MythosCreature', name: 'Ghoul' },
      playerFacingName: 'A shape in the cellar',
      playerFacingDescription: paragraph('It moves in the dark.'),
    },
  ],
  handouts: [
    { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' },
    { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" },
  ],
}

interface StoryArgs {
  data?: Scene | null
  tokens?: 'pending' | 'failing'
}

function SectionStory({ data = material, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders seed={(client) => data && client.setQueryData(sceneQueryKeys.detail('story-campaign', active.scenarioId, active.sceneId), data)}>
        <SidePanelScopeProvider>
          <div className="flex max-w-2xl flex-col gap-6">
            <KeeperReferenceSection campaignId="story-campaign" scene={active} />
          </div>
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/KeeperReferenceSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { data: { ...material, handouts: material.handouts.filter((handout) => handout.visibility === 'PlayerFacing'), nonPlayerEntityLinks: [] } } }

export const LoadError: Story = { args: { data: null, tokens: 'failing' } }
