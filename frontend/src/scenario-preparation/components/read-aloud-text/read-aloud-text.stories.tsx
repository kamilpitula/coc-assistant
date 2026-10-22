import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RichTextDocument } from '@/shared/types/RichText'

import { ReadAloudText } from './read-aloud-text'

const text = (value: string, format = 0) => ({ type: 'text', version: 1, text: value, format, style: '', detail: 0, mode: 'normal' })
const link = (value: string) => ({
  type: 'link',
  version: 1,
  url: 'https://example.com',
  target: '_blank',
  rel: 'noopener noreferrer',
  children: [text(value)],
})
const item = (value: string, order: number) => ({ type: 'listitem', version: 1, value: order, children: [text(value)] })

/** Every allowed node: headings, text formats, a link, a quote, and both list types. */
const everyNode: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('The porch')] },
      { type: 'paragraph', version: 1, children: [text('A cold draught greets you. '), text('Bold', 1), text(' '), text('italic', 2), text(' '), text('underlined', 8), text(' '), text('struck', 4)] },
      { type: 'heading', version: 1, tag: 'h4', children: [text('What you notice')] },
      { type: 'quote', version: 1, children: [text('Do not open the cellar door.')] },
      { type: 'list', version: 1, listType: 'bullet', tag: 'ul', start: 1, children: [item('Dust on the floor', 1), item('Footprints leading in', 2)] },
      { type: 'list', version: 1, listType: 'number', tag: 'ol', start: 1, children: [item('Knock', 1), item('Wait', 2)] },
      { type: 'paragraph', version: 1, children: [text('Read more '), link('here'), text('.')] },
    ],
  },
}

const meta = {
  title: 'ScenarioPreparation/ReadAloudText',
  component: ReadAloudText,
  args: { document: everyNode },
} satisfies Meta<typeof ReadAloudText>

export default meta
type Story = StoryObj<typeof meta>

export const WithEveryAllowedNode: Story = {}

export const ShortPassage: Story = {
  args: { document: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text('You stand before the door.')] }] } } },
}
