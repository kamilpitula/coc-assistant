import type { Meta, StoryObj } from '@storybook/react-vite'

import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneLinkSection } from './scene-link-section'

const ghoul: NonPlayerEntityLink = {
  id: 'link-1',
  nonPlayerEntity: { id: 'ghoul', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: null,
}
const knott: NonPlayerEntityLink = {
  id: 'link-2',
  nonPlayerEntity: { id: 'knott', type: 'HumanNpc', name: 'Mr. Knott' },
  playerFacingName: 'The landlord',
  playerFacingDescription: null,
}
const longName: NonPlayerEntityLink = {
  id: 'link-3',
  nonPlayerEntity: { id: 'long', type: 'HumanNpc', name: 'Bartholomew Archibald Winthrop-Ellsworth the Third of the Miskatonic Valley Historical Society' },
  playerFacingName: 'A very long Player-facing name that keeps going and going so that it has to wrap at 320 pixels wide without overflowing',
  playerFacingDescription: null,
}

interface StoryArgs {
  links: NonPlayerEntityLink[]
  status?: 'Prepared' | 'Active' | 'Finished'
  width?: number
}

function SectionStory({ links, status = 'Prepared', width }: StoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders>
        <SidePanelScopeProvider>
          <div style={width ? { width } : undefined}>
            <SceneLinkSection
              campaignId="story-campaign"
              scenarioId="story-scenario"
              sceneId="story-scene"
              status={status}
              links={links}
              onUnlinked={() => undefined}
              onRefetch={() => undefined}
            />
          </div>
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/SceneLinkSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { links: [] } }

export const LinksWithAndWithoutProfile: Story = { args: { links: [ghoul, knott] } }

export const Active: Story = { args: { links: [ghoul, knott], status: 'Active' } }

export const Finished: Story = { args: { links: [ghoul, knott], status: 'Finished' } }

export const LongNameAt320: Story = { args: { links: [longName], width: 320 } }
