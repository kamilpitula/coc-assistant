import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RichTextDocument } from '@/shared/types/RichText'

import { RichTextView } from './rich-text-view'

const text = (value: string, format = 0) => ({ type: 'text', version: 1, text: value, format, style: '', detail: 0, mode: 'normal' })
const block = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  direction: 'ltr',
  format: '',
  indent: 0,
  children,
  ...extra,
})
const item = (value: number, children: unknown[]) => block('listitem', children, { value })

const everyNode: RichTextDocument = {
  root: block('root', [
    block('heading', [text('Heading')], { tag: 'h3' }),
    block('paragraph', [text('Plain, '), text('bold', 1), text(', '), text('italic', 2), text(', '), text('underline', 8), text(', '), text('strike', 4)]),
    block('heading', [text('Subheading')], { tag: 'h4' }),
    block('paragraph', [
      text('A line'),
      { type: 'linebreak', version: 1 },
      text('then a '),
      block('link', [text('link')], { url: 'https://example.com', target: '_blank', rel: 'noopener noreferrer', title: null }),
    ]),
    block('quote', [text('A quote')]),
    block('list', [item(1, [text('One')]), item(2, [text('Two')])], { listType: 'bullet', start: 1, tag: 'ul' }),
    block('list', [item(1, [text('First')]), item(2, [text('Second')])], { listType: 'number', start: 1, tag: 'ol' }),
  ]) as RichTextDocument['root'],
}

const meta = {
  title: 'Shared/RichTextView',
  component: RichTextView,
} satisfies Meta<typeof RichTextView>

export default meta
type Story = StoryObj<typeof meta>

export const EveryAllowedNode: Story = { args: { document: everyNode } }
