import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'
import { clueOf, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { Clues } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CluesPanel } from './clues-panel'

const corbitt = { id: 's2', title: 'The Corbitt House' }
const knott = { id: 's1', title: 'Meeting Knott' }
const clues: Clues = {
  investigatorName: 'Lucy Ward',
  clues: [clueOf(textReveal, corbitt), clueOf(readAloudReveal, knott)],
}

interface PanelStoryArgs {
  role?: 'Keeper' | 'Player'
  data?: Clues | null
  loading?: boolean
}

function PanelStory({ role = 'Keeper', data = clues, loading = false }: PanelStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (!loading) {
            client.setQueryData(role === 'Keeper' ? cluesQueryKeys.investigator(STORY_CAMPAIGN_ID, 'story-investigator') : cluesQueryKeys.mine(STORY_CAMPAIGN_ID), data)
          }
        }}
      >
        <SidePanelScopeProvider>
          <CluesPanel campaignId={STORY_CAMPAIGN_ID} investigatorId={role === 'Keeper' ? 'story-investigator' : undefined} />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/CluesPanel',
  component: PanelStory,
} satisfies Meta<typeof PanelStory>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = {}

export const Player: Story = { args: { role: 'Player' } }

export const PlayerWithoutAnInvestigator: Story = { args: { role: 'Player', data: null } }

export const UnknownInvestigator: Story = { args: { data: null } }

export const Loading: Story = { args: { loading: true } }
