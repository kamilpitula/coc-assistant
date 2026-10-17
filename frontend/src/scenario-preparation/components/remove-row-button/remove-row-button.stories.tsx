import type { Meta, StoryObj } from '@storybook/react-vite'

import { RemoveRowButton } from './remove-row-button'

const meta = {
  title: 'ScenarioPreparation/RemoveRowButton',
  component: RemoveRowButton,
  args: { label: 'Remove skill Spot Hidden', onClick: () => undefined },
} satisfies Meta<typeof RemoveRowButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
