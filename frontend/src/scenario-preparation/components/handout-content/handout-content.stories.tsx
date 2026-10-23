import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RichTextDocument } from '@/shared/types/RichText'

import { HandoutContent } from './handout-content'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('The letter')] },
      { type: 'paragraph', version: 1, children: [text('My dear friend, I write to you from the cellar of the old Corbitt house.')] },
    ],
  },
}

const meta = {
  title: 'ScenarioPreparation/HandoutContent',
  component: HandoutContent,
  args: {
    owner: { type: 'scene', campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
    handout: { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The letter', content },
  },
} satisfies Meta<typeof HandoutContent>

export default meta
type Story = StoryObj<typeof meta>

export const ReadAloud: Story = {}

export const Text: Story = { args: { handout: { id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'The letter', content } } }
