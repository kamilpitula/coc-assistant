import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { gangsterHumanNpc, knottHumanNpc, STORY_HUMAN_NPC_ID, whateleyHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { HumanNpc } from '@/scenario-preparation/types/HumanNpc'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HumanNpcPage } from './human-npc-page'

interface StoryArgs {
  humanNpc?: HumanNpc | null
  role?: 'Keeper' | 'Player'
  tokens?: 'pending' | 'failing'
}

function PageStory({ humanNpc, role = 'Keeper', tokens = 'failing' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (humanNpc !== undefined) {
            client.setQueryData(nonPlayerEntityQueryKeys.humanNpc(STORY_CAMPAIGN_ID, STORY_HUMAN_NPC_ID), humanNpc)
          }
        }}
      >
        <HumanNpcPage campaignId={STORY_CAMPAIGN_ID} humanNpcId={STORY_HUMAN_NPC_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/HumanNpcPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const FullProfile: Story = { args: { humanNpc: gangsterHumanNpc } }
export const NarrativeOnly: Story = { args: { humanNpc: knottHumanNpc } }
export const MovementNotCovered: Story = { args: { humanNpc: whateleyHumanNpc } }
export const Loading: Story = { args: { tokens: 'pending' } }
export const LoadError: Story = {}
export const NotFound: Story = { args: { humanNpc: null } }
export const PlayerSeesNotFound: Story = { args: { role: 'Player', humanNpc: gangsterHumanNpc } }

export const Editing: Story = {
  args: { humanNpc: gangsterHumanNpc },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit' }))
  },
}

export const DeleteDialog: Story = {
  args: { humanNpc: gangsterHumanNpc },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Delete' }))
  },
}
