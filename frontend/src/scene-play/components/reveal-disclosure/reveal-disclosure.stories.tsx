import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { keeperReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RevealDisclosure } from './reveal-disclosure'

function ClosedStory({ keeper = false }: { keeper?: boolean }) {
  const reveal = keeper ? keeperReveal(readAloudReveal, 'h1', ['Harvey Walters', 'Lucy Ward']) : textReveal
  return (
    <StoryProviders>
      <RevealDisclosure
        campaignId="story-campaign"
        reveal={reveal}
        metaLine={
          <p className="text-sm text-muted-foreground">
            Read-aloud <span aria-hidden="true">&middot;</span> Revealed{' '}
            <time dateTime="2026-11-07T19:20:00Z">7 Nov 2026, 19:20</time>
            {keeper && (
              <>
                {' '}
                <span aria-hidden="true">&middot;</span> to Harvey Walters and Lucy Ward
              </>
            )}
          </p>
        }
      />
    </StoryProviders>
  )
}

const meta = {
  title: 'ScenePlay/RevealDisclosure',
  component: ClosedStory,
} satisfies Meta<typeof ClosedStory>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}

/** "Show" opens the Reveal's content as revealed. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Show A letter from Knott' }))
  },
}

export const KeeperMeta: Story = { args: { keeper: true } }
