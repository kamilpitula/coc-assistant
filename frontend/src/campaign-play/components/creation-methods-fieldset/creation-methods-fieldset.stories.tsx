import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import type { CreationMethod } from '@/campaign-play/types/Campaign'

import { CreationMethodsFieldset } from './creation-methods-fieldset'
import { NO_CREATION_METHOD_MESSAGE } from './creationMethodLabels'

function Interactive({ initial, error }: { initial: CreationMethod[]; error?: string }) {
  const [value, setValue] = useState<CreationMethod[]>(initial)
  return <CreationMethodsFieldset value={value} onChange={setValue} error={error} />
}

const meta = {
  title: 'CampaignPlay/CreationMethodsFieldset',
  component: Interactive,
} satisfies Meta<typeof Interactive>

export default meta
type Story = StoryObj<typeof meta>

export const AllAllowed: Story = {
  args: { initial: ['StandardRolling', 'PointBuy', 'QuickFire'] },
}

export const NoneChosen: Story = {
  args: { initial: [], error: NO_CREATION_METHOD_MESSAGE },
}
