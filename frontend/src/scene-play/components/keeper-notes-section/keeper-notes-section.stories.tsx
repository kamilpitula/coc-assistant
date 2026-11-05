import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { paragraph } from '@/scene-play/test-support/revealFixtures'

import { KeeperNotesSection } from './keeper-notes-section'

const meta = {
  title: 'ScenePlay/KeeperNotesSection',
  component: KeeperNotesSection,
  args: { notes: paragraph('Walter is in the cellar. He attacks if the door is forced.') },
} satisfies Meta<typeof KeeperNotesSection>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Hide Keeper notes' }))
  },
}

export const NoNotes: Story = {
  args: { notes: null },
}
