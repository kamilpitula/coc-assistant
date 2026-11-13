import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { VisibilityChoice, type VisibilityChoiceValue } from './visibility-choice'

function ChoiceStory({ initial }: { initial: VisibilityChoiceValue }) {
  const [value, setValue] = useState<VisibilityChoiceValue>(initial)

  return (
    <VisibilityChoice
      legend="Who can see this roll?"
      publicLabel="Public"
      publicDescription="Players roll it themselves and everyone sees the result."
      keeperOnlyLabel="Keeper only (hidden roll)"
      keeperOnlyDescription="The app rolls it now. Only you see it."
      value={value}
      onChange={setValue}
    />
  )
}

const meta = {
  title: 'Shared/VisibilityChoice',
  component: ChoiceStory,
} satisfies Meta<typeof ChoiceStory>

export default meta
type Story = StoryObj<typeof meta>

export const Public: Story = { args: { initial: 'Public' } }

export const KeeperOnly: Story = { args: { initial: 'KeeperOnly' } }
