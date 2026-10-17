import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/shared/components/ui/button'

import { StickyFormActions } from './sticky-form-actions'

const meta = {
  title: 'ScenarioPreparation/StickyFormActions',
  component: StickyFormActions,
  args: {
    children: (
      <>
        <Button type="submit">Save</Button>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </>
    ),
  },
} satisfies Meta<typeof StickyFormActions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
