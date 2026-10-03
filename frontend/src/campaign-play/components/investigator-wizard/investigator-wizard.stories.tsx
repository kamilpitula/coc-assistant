import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import {
  bracket45,
  emptySheetView,
  myCharacterSheet,
  problem,
  sheetView,
} from '@/campaign-play/test-support/characterSheetFixtures'
import type { MyCharacterSheet } from '@/campaign-play/types/Investigator'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { InvestigatorWizard } from './investigator-wizard'

const campaignId = 'story-campaign'

function withSheet(sheet: MyCharacterSheet) {
  return (Story: () => React.JSX.Element) => (
    <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.myCharacterSheet(campaignId), sheet)}>
      <Story />
    </StoryProviders>
  )
}

const meta = {
  title: 'CampaignPlay/InvestigatorWizard',
  component: InvestigatorWizard,
  args: { campaignId, step: 'identity' },
} satisfies Meta<typeof InvestigatorWizard>

export default meta
type Story = StoryObj<typeof meta>

export const NewDraftIdentity: Story = {
  decorators: [withSheet(myCharacterSheet({ characterSheet: emptySheetView() }))],
}

export const Characteristics: Story = {
  args: { step: 'characteristics' },
  decorators: [withSheet(myCharacterSheet())],
}

export const AgeEffectsAt45: Story = {
  args: { step: 'age' },
  decorators: [
    withSheet(
      myCharacterSheet({
        characterSheet: sheetView({
          identity: { name: 'Harvey Walters', age: 45, gender: null, residence: null, birthplace: null },
          ageEffects: { bracket: bracket45, deductions: { STR: 3 }, eduImprovementChecks: [] },
        }),
        validationErrors: [
          problem('AgeDeductionTotalMismatch', 'ageEffects.deductions', 'Deduct exactly 5 points in total. You have deducted 3.'),
        ],
      }),
    ),
  ],
}

export const SheetAndSubmitWithChangesRequested: Story = {
  args: { step: 'sheet' },
  decorators: [
    withSheet(myCharacterSheet({ status: 'ChangesRequested', changeRequestComment: 'Credit Rating seems high for this Occupation' })),
  ],
}

export const SubmittedReadOnly: Story = {
  decorators: [withSheet(myCharacterSheet({ status: 'Submitted' }))],
}
