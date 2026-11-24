import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { act } from 'react'

import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { KeeperNotesSection } from './keeper-notes-section'

// Keeper notes editing with autosave (specs/scenario-preparation/ux.md section 73).

const notes = (text: string): RichTextDocument => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] },
})

function PageStory() {
  return (
    <StoryMsal tokens="granted">
      <StoryProviders>
        <KeeperNotesSection campaignId="story-campaign" scenarioId="story-scenario" sceneId="story-scene" keeperNotes={notes('Walter is in the cellar.')} notesVersion={4} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/KeeperNotesSection',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const ReadingWithNotes: Story = {}

export const ReadingWithoutNotes: Story = {
  render: () => (
    <StoryMsal tokens="granted">
      <StoryProviders>
        <KeeperNotesSection campaignId="story-campaign" scenarioId="story-scenario" sceneId="story-scene" keeperNotes={null} notesVersion={0} />
      </StoryProviders>
    </StoryMsal>
  ),
}

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

async function openEditor(canvas: ReturnType<typeof within>) {
  await userEvent.click(canvas.getByRole('button', { name: 'Edit Keeper notes' }))
  return canvas.getByRole('textbox', { name: 'Keeper notes' }) as EditableElement
}

async function setNotes(box: EditableElement, value: string) {
  const editor = box.__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode(value)))
    })
  })
}

function stubNotesFetch(handler: () => Promise<Response>) {
  const original = window.fetch
  window.fetch = (() => handler()) as typeof fetch
  return () => {
    window.fetch = original
  }
}

const savedResponse = (keeperNotes: unknown, notesVersion: number) =>
  new Response(JSON.stringify({ keeperNotes, notesVersion }), { status: 200, headers: { 'Content-Type': 'application/json' } })

export const EditingIdle: Story = {
  play: async ({ canvasElement }) => {
    await openEditor(within(canvasElement))
  },
}

export const Saving: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(() => new Promise(() => undefined))
    try {
      const box = await openEditor(within(canvasElement))
      await setNotes(box, 'Walter is in the cellar, twice.')
      await within(canvasElement).findByText('Saving...')
    } finally {
      restore()
    }
  },
}

export const Saved: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(() => Promise.resolve(savedResponse(notes('Walter is in the cellar, twice.'), 5)))
    try {
      const canvas = within(canvasElement)
      await setNotes(await openEditor(canvas), 'Walter is in the cellar, twice.')
      await canvas.findByText('All changes saved')
    } finally {
      restore()
    }
  },
}

export const Retrying: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(() => Promise.reject(new Error('The network is down')))
    try {
      const canvas = within(canvasElement)
      await setNotes(await openEditor(canvas), 'Walter is in the cellar, twice.')
      await canvas.findByText("Couldn't save. Retrying...")
    } finally {
      restore()
    }
  },
}

export const Failed: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(() => Promise.reject(new Error('The network is down')))
    try {
      const canvas = within(canvasElement)
      await setNotes(await openEditor(canvas), 'Walter is in the cellar, twice.')
      await canvas.findByText("Couldn't save your changes.", undefined, { timeout: 15000 })
    } finally {
      restore()
    }
  },
}

export const Offline: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await setNotes(await openEditor(canvas), 'Walter is in the cellar, twice.')
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
    })
    await canvas.findByText("You're offline. Your changes will save when you're back online.")
    await act(async () => {
      window.dispatchEvent(new Event('online'))
    })
  },
}

export const OfflineAfterDone: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(() => new Promise(() => undefined))
    try {
      const canvas = within(canvasElement)
      const box = await openEditor(canvas)
      await setNotes(box, 'Walter is in the cellar, twice.')
      await act(async () => {
        window.dispatchEvent(new Event('offline'))
      })
      await userEvent.click(canvas.getByRole('button', { name: 'Done' }))
      await canvas.findByText("Your changes aren't saved yet. Keep this page open until you're back online, then select Done.")
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })
    } finally {
      restore()
    }
  },
}

export const Conflict: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(() =>
      Promise.resolve(
        new Response(JSON.stringify({ keeperNotes: notes('Newer'), notesVersion: 5 }), {
          status: 409,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    )
    try {
      const canvas = within(canvasElement)
      await setNotes(await openEditor(canvas), 'Mine')
      await canvas.findByText('These Keeper notes were changed in another window.')
    } finally {
      restore()
    }
  },
}

export const Refused: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(
      () => Promise.resolve(new Response(JSON.stringify({ errors: { keeperNotes: ['x'] } }), { status: 400 })),
    )
    try {
      const canvas = within(canvasElement)
      await setNotes(await openEditor(canvas), 'Mine')
      await canvas.findByText("These Keeper notes can't be saved. Shorten them or remove unsupported content.")
    } finally {
      restore()
    }
  },
}

export const TooLong: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await setNotes(await openEditor(canvas), `x${'a'.repeat(300_000)}`)
    await canvas.findByText('Keeper notes are too long. Shorten them and try again.')
  },
}

export const SceneGone: Story = {
  play: async ({ canvasElement }) => {
    const restore = stubNotesFetch(() => Promise.resolve(new Response(null, { status: 404 })))
    try {
      const canvas = within(canvasElement)
      await setNotes(await openEditor(canvas), 'Mine')
      await canvas.findByText("We couldn't find this Scene any more. Copy anything you need.")
    } finally {
      restore()
    }
  },
}
