import type { Meta, StoryObj } from '@storybook/react-vite'

import { keeperReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RevealedSection } from './revealed-section'

const reveals: KeeperReveal[] = [
  keeperReveal({ ...textReveal, revealedAt: '2026-10-28T19:58:00Z' }, 'h3', ['Lucy Ward']),
  keeperReveal(readAloudReveal, 'h1', ['Harvey Walters']),
]

function SectionStory({ items = reveals }: { items?: KeeperReveal[] }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders>
        <SidePanelScopeProvider>
          <div className="flex max-w-2xl flex-col gap-6">
            <RevealedSection reveals={items} />
          </div>
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/RevealedSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { items: [] } }
