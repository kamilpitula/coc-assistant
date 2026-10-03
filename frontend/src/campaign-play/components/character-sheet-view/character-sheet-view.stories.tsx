import type { Meta, StoryObj } from '@storybook/react-vite'

import { emptySheetView, sheetView } from '@/campaign-play/test-support/characterSheetFixtures'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CharacterSheetView } from './character-sheet-view'

const meta = {
  title: 'CampaignPlay/CharacterSheetView',
  component: CharacterSheetView,
  args: { playerName: 'Ada Lovelace' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof CharacterSheetView>

export default meta
type Story = StoryObj<typeof meta>

export const ReadOnly: Story = { args: { sheet: sheetView() } }

export const WithChangeLinks: Story = { args: { sheet: sheetView(), changeLinksFor: 'story-campaign' } }

export const NotYetCalculated: Story = { args: { sheet: emptySheetView() } }
