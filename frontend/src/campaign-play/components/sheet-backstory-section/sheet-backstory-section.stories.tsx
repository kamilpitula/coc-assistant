import type { Meta, StoryObj } from '@storybook/react-vite'
import { useReducer } from 'react'

import { characterSheetFormReducer, EMPTY_BACKSTORY } from '@/campaign-play/state/characterSheetForm'
import { validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { SheetBackstorySection } from './sheet-backstory-section'

const backstory = {
  ...EMPTY_BACKSTORY,
  myStory: 'Grew up above a bookshop in Arkham.',
  traits: 'Stubborn, curious',
  significantPeople: 'My sister Ada, who taught me to read.',
}

const meta = {
  title: 'CampaignPlay/SheetBackstorySection',
  component: SheetBackstorySection,
} satisfies Meta<typeof SheetBackstorySection>

export default meta
type Story = StoryObj<typeof meta>

export const ReadOnly: Story = { args: { backstory, keyConnection: 'significantPeople' } }

export const NoneRecorded: Story = { args: { backstory: EMPTY_BACKSTORY, keyConnection: null } }

function EditingSection() {
  const [inputs, dispatch] = useReducer(characterSheetFormReducer, { ...validInputs, backstory, keyConnection: 'significantPeople' })
  return (
    <SheetBackstorySection
      backstory={inputs.backstory}
      keyConnection={inputs.keyConnection}
      editing={{ inputs, errors: {}, onAction: dispatch, onBlur: () => {} }}
    />
  )
}

export const Editing: Story = { args: { backstory, keyConnection: 'significantPeople' }, render: () => <EditingSection /> }
