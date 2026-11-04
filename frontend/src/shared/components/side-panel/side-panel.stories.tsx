import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SidePanel } from './side-panel'
import { SidePanelContent } from './side-panel-content'

function PanelStory({ state, title }: { state: 'loading' | 'error' | 'not-found' | 'ready'; title: string | null }) {
  const [open, setOpen] = useState(true)

  return (
    <StoryProviders>
      <SidePanelScopeProvider>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <SidePanel open={open} onClose={() => setOpen(false)}>
          <SidePanelContent
            kindLabel="Clues"
            title={title}
            state={state}
            footer={
              <a href="/campaigns/story-campaign/investigators/story-investigator/clues?from=active-scene" className="font-medium underline underline-offset-4">
                Open full page
              </a>
            }
          >
            <p className="text-sm">Lucy Ward&apos;s Clues would list here.</p>
          </SidePanelContent>
        </SidePanel>
      </SidePanelScopeProvider>
    </StoryProviders>
  )
}

const meta = {
  title: 'Shared/SidePanel',
  component: PanelStory,
} satisfies Meta<typeof PanelStory>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = { args: { state: 'ready', title: "Lucy Ward's Clues" } }

export const Loading: Story = { args: { state: 'loading', title: null } }

export const Error: Story = { args: { state: 'error', title: null } }

export const NotFound: Story = { args: { state: 'not-found', title: null } }
