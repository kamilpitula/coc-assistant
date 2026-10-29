import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { paragraph, keeperReveal, readAloudReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneMaterialSection } from './scene-material-section'

const active: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }],
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
  scene?: KeeperActiveScene
  data?: Scene | null
  tokens?: 'pending' | 'failing'
}

function SectionStory({ scene = active, data = material, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders seed={(client) => data && client.setQueryData(sceneQueryKeys.detail('story-campaign', scene.scenarioId, scene.sceneId), data)}>
        <div className="flex max-w-2xl flex-col gap-6">
          <SceneMaterialSection campaignId="story-campaign" scene={scene} onRevealed={() => undefined} onSceneFinished={() => undefined} onRefetch={() => undefined} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/SceneMaterialSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const MixedVisibilities: Story = {}

export const Empty: Story = { args: { data: { ...material, keeperNotes: null, handouts: [], nonPlayerEntityLinks: [] } } }

export const Revealed: Story = { args: { scene: { ...active, reveals: [keeperReveal(readAloudReveal, 'h1', ['Harvey Walters'])] } } }

export const LoadError: Story = { args: { data: null, tokens: 'failing' } }

export const RevealDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Reveal The front door' }))
  },
}

export const At320px: Story = {
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
}
