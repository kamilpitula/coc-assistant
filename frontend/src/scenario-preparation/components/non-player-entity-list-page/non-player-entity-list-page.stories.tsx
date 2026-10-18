import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { NonPlayerEntityListPage } from './non-player-entity-list-page'

const humans: NonPlayerEntitySummary[] = Array.from({ length: 12 }, (_, index) => ({
  id: `h${index}`,
  type: 'HumanNpc',
  name: `Human NPC ${index + 1}`,
}))
const knott: NonPlayerEntitySummary = { id: 'knott', type: 'HumanNpc', name: 'Mr. Knott' }
const ghoul: NonPlayerEntitySummary = { id: 'ghoul', type: 'MythosCreature', name: 'Ghoul' }
const longName: NonPlayerEntitySummary = {
  id: 'long',
  type: 'HumanNpc',
  name: 'Bartholomew Archibald Winthrop-Ellsworth the Third of the Miskatonic Valley Historical Society',
}

interface StoryArgs {
  items?: NonPlayerEntitySummary[]
  tokens?: 'pending' | 'failing'
  width?: number
}

function PageStory({ items, tokens = 'pending', width }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          if (items) {
            client.setQueryData(nonPlayerEntityQueryKeys.list(STORY_CAMPAIGN_ID), items)
          }
        }}
      >
        <div style={width ? { width } : undefined}>
          <NonPlayerEntityListPage campaignId={STORY_CAMPAIGN_ID} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/NonPlayerEntityListPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyCampaign: Story = { args: { items: [] } }
export const ManyProfiles: Story = { args: { items: [...humans, knott, ghoul] } }
export const Narrow320: Story = { args: { items: [knott, ghoul, longName], width: 320 } }
export const Loading: Story = {}
export const LoadError: Story = { args: { tokens: 'failing' } }

export const SearchWithMatches: Story = {
  args: { items: [knott, ghoul, ...humans] },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'kno')
  },
}

export const NoMatch: Story = {
  args: { items: [knott, ghoul] },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'zzz')
  },
}

export const FilteredToMythosCreatures: Story = {
  args: { items: [knott, ghoul] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('radio', { name: 'Mythos Creatures' }))
  },
}
