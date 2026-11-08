import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { WallEntryPage } from '@/campaign-play/types/WallEntry'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ActiveSceneWall } from './active-scene-wall'

const CAMPAIGN_ID = 'story-campaign'

const page: WallEntryPage = {
  nextCursor: null,
  entries: [
    {
      id: 'e2',
      text: 'The front door slams shut behind Harvey.',
      visibility: 'Public',
      createdAt: '2026-10-28T19:14:00Z',
      authorDisplayName: 'Keeper',
    },
    {
      id: 'e1',
      text: 'Corbitt has noticed Cy.',
      visibility: 'KeeperOnly',
      createdAt: '2026-10-28T19:10:00Z',
      authorDisplayName: 'Keeper',
    },
  ],
}

function WallStory({ viewerRole }: { viewerRole: 'Keeper' | 'Player' }) {
  return (
    <StoryMsal>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.wallPreview(CAMPAIGN_ID), page)}>
        <div className="max-w-xl">
          <ActiveSceneWall campaignId={CAMPAIGN_ID} viewerRole={viewerRole} onWallEntryAdded={() => undefined} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ActiveSceneWall',
  component: WallStory,
} satisfies Meta<typeof WallStory>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = { args: { viewerRole: 'Keeper' } }

export const Player: Story = { args: { viewerRole: 'Player' } }
