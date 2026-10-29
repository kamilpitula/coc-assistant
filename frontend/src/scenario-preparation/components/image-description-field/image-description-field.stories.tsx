import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ImageDescriptionField } from './image-description-field'

function FieldStory({ initial = '', error }: { initial?: string; error?: string }) {
  const [value, setValue] = useState(initial)
  return <ImageDescriptionField value={value} onChange={setValue} error={error} inputId="description" hintId="description-hint" errorId="description-error" />
}

const meta = {
  title: 'ScenarioPreparation/ImageDescriptionField',
  component: FieldStory,
} satisfies Meta<typeof FieldStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Filled: Story = { args: { initial: 'A plan of the cellar with the furnace in the north-east corner.' } }

export const TooLong: Story = { args: { initial: 'a'.repeat(1001), error: 'Image description must be 1,000 characters or fewer.' } }
