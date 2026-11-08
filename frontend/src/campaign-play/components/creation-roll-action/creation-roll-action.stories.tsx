import type { Meta, StoryObj } from '@storybook/react-vite'

import { CreationRollAction } from './creation-roll-action'

const meta = {
  title: 'CampaignPlay/CreationRollAction',
  component: CreationRollAction,
  args: {
    id: 'roll-trigger',
    label: 'Roll characteristics',
    body: "The app rolls STR, CON, DEX, APP, POW (3D6); SIZ, INT, EDU (2D6) once. You can't roll them again, and you can't change your creation method afterwards.",
    onRoll: () => {},
  },
} satisfies Meta<typeof CreationRollAction>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = { args: { pending: false } }

export const Pending: Story = { args: { pending: true } }
