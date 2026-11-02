import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'
import { revealQueryKeys } from '@/scene-play/services/revealApi'
import { clueOf, imageReveal, mapReveal, pngBlob, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { Clues } from '@/scene-play/types/Reveal'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CluesPage } from './clues-page'

const corbitt = { id: 's2', title: 'The Corbitt House' }
const knott = { id: 's1', title: 'Meeting Knott' }
const clues: Clues = {
  investigatorName: 'Harvey Walters',
  clues: [clueOf(mapReveal, corbitt), clueOf(readAloudReveal, corbitt), clueOf(imageReveal, knott), clueOf(textReveal, knott)],
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  data?: Clues | null
  loading?: boolean
}

function PageStory({ role = 'Player', data = clues, loading = false }: StoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          client.setQueryData(revealQueryKeys.file(STORY_CAMPAIGN_ID, mapReveal.revealId), pngBlob())
          if (!loading) {
            client.setQueryData(role === 'Keeper' ? cluesQueryKeys.investigator(STORY_CAMPAIGN_ID, 'story-investigator') : cluesQueryKeys.mine(STORY_CAMPAIGN_ID), data)
          }
        }}
      >
        <CluesPage campaignId={STORY_CAMPAIGN_ID} investigatorId={role === 'Keeper' ? 'story-investigator' : undefined} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/CluesPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Player: Story = {}

export const Keeper: Story = { args: { role: 'Keeper' } }

export const Empty: Story = { args: { data: { investigatorName: 'Harvey Walters', clues: [] } } }

export const PlayerWithoutAnInvestigator: Story = { args: { data: null } }

export const KeeperUnknownInvestigator: Story = { args: { role: 'Keeper', data: null } }

export const Loading: Story = { args: { loading: true } }
