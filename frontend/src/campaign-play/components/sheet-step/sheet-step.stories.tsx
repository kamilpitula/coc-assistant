import type { Meta, StoryObj } from '@storybook/react-vite'
import { useReducer } from 'react'

import { characterSheetFormReducer } from '@/campaign-play/state/characterSheetForm'
import { myCharacterSheet, problem, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SheetStep } from './sheet-step'

const warnings = [
  problem('PersonalInterestPointsUnspent', 'personalInterestPoints', 'You have 60 personal interest points left. Unspent points are lost.', 'Warning'),
  problem('PointBuyBelowRecommendation', 'characteristics.SIZ', 'SIZ is below the recommended 40. Check with your Keeper.', 'Warning'),
]

const meta = {
  title: 'CampaignPlay/SheetStep',
  component: SheetStep,
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof SheetStep>

export default meta
type Story = StoryObj<typeof meta>

function EditingStep({ withWarnings }: { withWarnings: boolean }) {
  const [inputs, dispatch] = useReducer(characterSheetFormReducer, validInputs)
  return (
    <SheetStep
      campaignId="story-campaign"
      sheet={myCharacterSheet({ validationErrors: withWarnings ? warnings : [] })}
      editing={{ inputs, errors: {}, onAction: dispatch, onBlur: () => {} }}
    />
  )
}

const editingArgs = { campaignId: 'story-campaign', sheet: myCharacterSheet(), editing: { inputs: validInputs, errors: {}, onAction: () => {}, onBlur: () => {} } }

export const WithWarnings: Story = { args: editingArgs, render: () => <EditingStep withWarnings /> }

export const NoWarnings: Story = { args: editingArgs, render: () => <EditingStep withWarnings={false} /> }
