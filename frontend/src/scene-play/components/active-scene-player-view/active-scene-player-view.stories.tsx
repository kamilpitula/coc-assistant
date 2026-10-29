import type { Meta, StoryObj } from '@storybook/react-vite'

import { ActiveScenePlayerView } from './active-scene-player-view'

const meta = {
  title: 'ScenePlay/ActiveScenePlayerView',
  component: ActiveScenePlayerView,
} satisfies Meta<typeof ActiveScenePlayerView>

export default meta
type Story = StoryObj<typeof meta>

export const Present: Story = {
  args: {
    scene: {
      kind: 'present-player',
      title: 'The Corbitt House',
      location: 'Arkham, Boston Road',
      investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }, { name: 'Lucy Ward', isYours: false }],
    },
  },
}

export const NotPresent: Story = { args: { scene: { kind: 'absent-player', title: 'The Corbitt House' } } }
