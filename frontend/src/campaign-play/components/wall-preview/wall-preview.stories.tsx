import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { WallEntryPage } from '@/campaign-play/types/WallEntry'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { WallPreview } from './wall-preview'

const CAMPAIGN_ID = 'story-campaign'

const page: WallEntryPage = {
  nextCursor: null,
  entries: [
    {
      id: 'e2',
      text: 'The lamp flickers and goes out.',
      visibility: 'Public',
      createdAt: '2026-10-16T19:02:00Z',
      authorDisplayName: 'Eleanor Hart',
    },
    {
      id: 'e1',
      text: 'Ana finds a torn letter in the desk.',
      visibility: 'KeeperOnly',
      createdAt: '2026-10-16T18:55:00Z',
      authorDisplayName: 'Eleanor Hart',
    },
  ],
}

function PreviewStory({ seed }: { seed: WallEntryPage }) {
  return (
    <StoryMsal>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.wallPreview(CAMPAIGN_ID), seed)}>
        <div className="max-w-sm">
          <WallPreview campaignId={CAMPAIGN_ID} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/WallPreview',
  component: PreviewStory,
} satisfies Meta<typeof PreviewStory>

export default meta
type Story = StoryObj<typeof meta>

export const WithEntries: Story = { args: { seed: page } }

export const Empty: Story = { args: { seed: { entries: [], nextCursor: null } } }
