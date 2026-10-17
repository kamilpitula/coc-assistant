import type { Meta, StoryObj } from '@storybook/react-vite'

import { RemoveSectionDialog } from './remove-section-dialog'

const meta = {
  title: 'ScenarioPreparation/RemoveSectionDialog',
  component: RemoveSectionDialog,
  args: { open: true, section: 'Skills', onKeep: () => undefined, onRemove: () => undefined },
} satisfies Meta<typeof RemoveSectionDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}
