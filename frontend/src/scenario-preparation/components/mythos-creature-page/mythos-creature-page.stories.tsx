import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { ghoulMythosCreature, STORY_MYTHOS_CREATURE_ID } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import type { MythosCreature } from '@/scenario-preparation/types/MythosCreature'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { MythosCreaturePage } from './mythos-creature-page'

interface StoryArgs {
  mythosCreature?: MythosCreature | null
  role?: 'Keeper' | 'Player'
  tokens?: 'pending' | 'failing'
}

function PageStory({ mythosCreature, role = 'Keeper', tokens = 'failing' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (mythosCreature !== undefined) {
            client.setQueryData(nonPlayerEntityQueryKeys.mythosCreature(STORY_CAMPAIGN_ID, STORY_MYTHOS_CREATURE_ID), mythosCreature)
          }
        }}
      >
        <MythosCreaturePage campaignId={STORY_CAMPAIGN_ID} mythosCreatureId={STORY_MYTHOS_CREATURE_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/MythosCreaturePage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Profile: Story = { args: { mythosCreature: ghoulMythosCreature } }
export const Loading: Story = { args: { tokens: 'pending' } }
export const LoadError: Story = {}
export const NotFound: Story = { args: { mythosCreature: null } }
export const PlayerSeesNotFound: Story = { args: { role: 'Player', mythosCreature: ghoulMythosCreature } }

export const Editing: Story = {
  args: { mythosCreature: ghoulMythosCreature },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit' }))
  },
}

export const DeleteDialog: Story = {
  args: { mythosCreature: ghoulMythosCreature },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Delete' }))
  },
}
