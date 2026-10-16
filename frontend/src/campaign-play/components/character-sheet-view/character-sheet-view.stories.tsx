import type { Meta, StoryObj } from '@storybook/react-vite'

import { EMPTY_BACKSTORY } from '@/campaign-play/state/characterSheetForm'
import { emptySheetView, sheetView, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
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

export const WithBackstoryWeaponsAndGear: Story = {
  args: {
    sheet: sheetView({
      backstory: { ...EMPTY_BACKSTORY, myStory: 'Grew up above a bookshop in Arkham.', significantPeople: 'My sister Ada' },
      keyConnection: 'significantPeople',
      weapons: [{ name: '.38 Revolver', skill: 'Firearms (Handgun)', damage: '1D10', attacks: '1 (3)', range: '15 yards', ammo: '6', malfunction: '100', isCustom: true }],
      gear: 'Camera, notebook, lantern',
    }),
  },
}

export const Editing: Story = {
  args: {
    sheet: sheetView(),
    changeLinksFor: 'story-campaign',
    editing: { inputs: validInputs, errors: {}, onAction: () => {}, onBlur: () => {} },
  },
}
