import type { Meta, StoryObj } from '@storybook/react-vite'

import { heldItemsQueryKeys, type InvestigatorHeldItems, type MyHeldItems } from '@/scene-play/services/itemHolderApi'
import { paragraph } from '@/scene-play/test-support/revealFixtures'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HeldItemsSection } from './held-items-section'

// specs/scene-play/ux.md section 22.7; SPL-UX-52 to SPL-UX-55.
const STORY_CAMPAIGN_ID = 'story-campaign'
const STORY_INVESTIGATOR_ID = 'story-investigator'

const diary = { revealId: 'r1', name: "Walter Corbitt's diary", description: paragraph("Walter's last entry."), givenAt: '2026-10-28T19:58:00Z' }
const key = { revealId: 'r2', name: 'A brass key', description: paragraph('It opens the cellar.'), givenAt: '2026-10-28T20:02:00Z' }

const playerItems: MyHeldItems = { investigatorName: 'Harvey Walters', items: [key, diary] }
const keeperItems: InvestigatorHeldItems = {
  investigatorName: 'Harvey Walters',
  items: [
    { ...key, itemId: 'story-item-2' },
    { ...diary, itemId: 'story-item-1' },
  ],
}

interface StoryArgs {
  role?: 'Player' | 'Keeper'
  data?: MyHeldItems | InvestigatorHeldItems | null
  loading?: boolean
}

function SectionStory({ role = 'Player', data = role === 'Keeper' ? keeperItems : playerItems, loading = false }: StoryArgs) {
  const investigatorId = role === 'Keeper' ? STORY_INVESTIGATOR_ID : undefined
  return (
    <StoryMsal tokens={data === null && !loading ? 'failing' : 'pending'}>
      <StoryProviders
        seed={(client) => {
          if (!loading && data) {
            client.setQueryData(
              role === 'Keeper' ? heldItemsQueryKeys.investigator(STORY_CAMPAIGN_ID, STORY_INVESTIGATOR_ID) : heldItemsQueryKeys.mine(STORY_CAMPAIGN_ID),
              data,
            )
          }
        }}
      >
        <div className="flex max-w-2xl flex-col gap-6">
          <HeldItemsSection campaignId={STORY_CAMPAIGN_ID} investigatorId={investigatorId} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/HeldItemsSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Player: Story = {}

export const Keeper: Story = { args: { role: 'Keeper' } }

export const Empty: Story = { args: { data: { investigatorName: 'Harvey Walters', items: [] } } }

export const Loading: Story = { args: { loading: true } }

export const LoadError: Story = { args: { data: null } }
