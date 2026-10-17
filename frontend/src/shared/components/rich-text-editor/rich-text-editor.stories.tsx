import type { Meta, StoryObj } from '@storybook/react-vite'

import type { RichTextDocument } from '@/shared/types/RichText'

import { RichTextEditor } from './rich-text-editor'

const formatted: RichTextDocument = {
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'heading',
        version: 1,
        tag: 'h3',
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [{ type: 'text', version: 1, text: 'The cellar', format: 0, style: '', detail: 0, mode: 'normal' }],
      },
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text: 'The key is ', format: 0, style: '', detail: 0, mode: 'normal' },
          { type: 'text', version: 1, text: 'under the stairs', format: 1, style: '', detail: 0, mode: 'normal' },
        ],
      },
    ],
  },
}

function EditorStory({ initialValue, invalid }: { initialValue: RichTextDocument | null; invalid?: boolean }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <span id="story-label" className="text-sm font-medium">
        Keeper notes (optional)
      </span>
      <RichTextEditor
        id="story-notes"
        labelledBy="story-label"
        describedBy={invalid ? 'story-hint story-error' : 'story-hint'}
        invalid={invalid}
        initialValue={initialValue}
        onChange={() => undefined}
      />
      <p id="story-hint" className="text-sm text-muted-foreground">
        Only you can read these. You can format text and add links.
      </p>
      {invalid && (
        <p id="story-error" className="text-sm text-destructive">
          Keeper notes are too long. Shorten them and try again.
        </p>
      )}
    </div>
  )
}

const meta = {
  title: 'Shared/RichTextEditor',
  component: EditorStory,
} satisfies Meta<typeof EditorStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { initialValue: null } }

export const WithFormattedNotes: Story = { args: { initialValue: formatted } }

export const WithError: Story = { args: { initialValue: formatted, invalid: true } }
