import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { paragraph } from '@/scene-play/test-support/revealFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ToRevealSection } from './to-reveal-section'

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

const reveal = (overrides: Partial<KeeperReveal> = {}): KeeperReveal => ({
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [{ id: 'i1', name: 'Harvey Walters' }],
  ...overrides,
})

const members: CampaignMember[] = [
  { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false, investigator: null },
  { memberId: 'a', displayName: 'Ana Ruiz', role: 'Player', isYou: false, investigator: { visibility: 'Visible', id: 'i1', name: 'Harvey Walters', status: 'Approved' } },
  { memberId: 'b', displayName: 'Ben Cole', role: 'Player', isYou: false, investigator: { visibility: 'Visible', id: 'i2', name: 'Lucy Ward', status: 'Approved' } },
]

const itemLinks: ItemLink[] = [
  {
    id: 'il1',
    item: {
      id: 'item1',
      name: "Walter Corbitt's diary",
      holder: { investigatorId: 'i1' },
      handouts: [{ id: 'ih1', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }],
    },
  },
  {
    id: 'il2',
    item: { id: 'item2', name: 'A brass key', holder: null, handouts: [] },
  },
]

interface StoryArgs {
  scene?: KeeperActiveScene
  data?: Scene | null
  tokens?: 'pending' | 'failing'
}

function SectionStory({ scene = active, data = material, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.members('story-campaign'), members)
          if (data) {
            client.setQueryData(sceneQueryKeys.detail('story-campaign', scene.scenarioId, scene.sceneId), data)
          }
        }}
      >
        <SidePanelScopeProvider>
          <div className="flex max-w-2xl flex-col gap-6">
            <ToRevealSection campaignId="story-campaign" scene={scene} onReveal={() => undefined} onGive={() => undefined} />
          </div>
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ToRevealSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const PartiallyRevealed: Story = { args: { scene: { ...active, reveals: [reveal()] } } }

export const Empty: Story = {
  args: {
    scene: {
      ...active,
      reveals: [
        reveal({ subjectId: 'h1', recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }] }),
        reveal({
          revealId: 'r2',
          subjectId: 'l1',
          subjectType: 'NonPlayerEntity',
          title: 'A shape in the cellar',
          handoutKind: null,
          recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }],
        }),
      ],
    },
  },
}

export const LoadError: Story = { args: { data: null, tokens: 'failing' } }

/** Linked Items join To reveal with their holder status and a "Give..." action (SPL-UX-51, SPL-UX-52). */
export const WithItems: Story = { args: { data: { ...material, itemLinks } } }
