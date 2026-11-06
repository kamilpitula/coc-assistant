import type { Meta, StoryObj } from '@storybook/react-vite'

import { MoveControls } from '@/scenario-preparation/components/move-controls/move-controls'
import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import { Button } from '@/shared/components/ui/button'

import { MaterialEntry, MaterialEntryList, type MaterialEntrySubject } from './material-entry'

const handout: HandoutSummary = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }
const link: NonPlayerEntityLink = {
  id: 'l1',
  nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Thug' },
  playerFacingName: 'The man by the gate',
  playerFacingDescription: null,
}
const itemLink: ItemLink = { id: 'i1', item: { id: 't1', name: 'A brass key', holder: null, handouts: [] } }
const itemHandout: HandoutSummary = { id: 'h2', kind: 'Text', visibility: 'PlayerFacing', title: 'A folded note' }

interface EntryStoryArgs {
  subject: MaterialEntrySubject
  titleId: string
  scenePage?: boolean
}

function EntryStory({ subject, titleId, scenePage = true }: EntryStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders>
        <SidePanelScopeProvider>
          <MaterialEntryList as={subject.type === 'handout' ? 'ol' : 'ul'}>
            <MaterialEntry
              subject={subject}
              titleId={titleId}
              status={scenePage ? undefined : <p className="text-sm break-words text-muted-foreground">Revealed to Harvey Walters</p>}
              action={
                scenePage ? (
                  <ScenePageAction subject={subject} />
                ) : (
                  <Button type="button" variant="outline" size="sm" aria-label={`Reveal ${titleOf(subject)}`}>
                    Reveal...
                  </Button>
                )
              }
            />
          </MaterialEntryList>
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

function titleOf(subject: MaterialEntrySubject): string {
  switch (subject.type) {
    case 'handout':
      return subject.handout.title
    case 'entity':
      return subject.link.playerFacingName
    case 'item':
      return subject.link.item.name
    case 'itemHandout':
      return subject.handout.title
  }
}

function ScenePageAction({ subject }: { subject: MaterialEntrySubject }) {
  switch (subject.type) {
    case 'handout':
      return <MoveControls itemId="h1" title="The front door" isFirst isLast={false} saving={false} buttonIdPrefix="handout" onMove={() => undefined} />
    case 'entity':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" aria-label="Edit The man by the gate">
            Edit
          </Button>
          <Button type="button" variant="outline" size="sm" className="text-destructive" aria-label="Unlink The man by the gate">
            Unlink
          </Button>
        </div>
      )
    case 'item':
      return (
        <Button type="button" variant="outline" size="sm" className="text-destructive" aria-label="Unlink A brass key">
          Unlink
        </Button>
      )
  }
}

const meta = {
  title: 'ScenarioPreparation/MaterialEntry',
  component: EntryStory,
} satisfies Meta<typeof EntryStory>

export default meta
type Story = StoryObj<typeof meta>

export const HandoutOnScenePage: Story = { args: { subject: { type: 'handout', handout }, titleId: 'handout-link-h1' } }

export const NonPlayerEntityOnScenePage: Story = { args: { subject: { type: 'entity', link }, titleId: 'entity-link-l1' } }

export const ItemOnScenePage: Story = { args: { subject: { type: 'item', link: itemLink }, titleId: 'item-link-i1' } }

export const ItemHandoutOnScenePage: Story = {
  args: { subject: { type: 'itemHandout', link: itemLink, handout: itemHandout }, titleId: 'handout-link-h2' },
}

export const HandoutOnItemPage: Story = {
  args: {
    subject: {
      type: 'handout',
      handout,
      page: {
        to: '/campaigns/$campaignId/items/$itemId/handouts/$handoutId',
        params: { campaignId: 'story-campaign', itemId: 't1', handoutId: 'h1' },
      },
    },
    titleId: 'handout-link-h1',
  },
}

export const HandoutOnActiveScene: Story = { args: { subject: { type: 'handout', handout }, titleId: 'handout-link-h1', scenePage: false } }

export const NonPlayerEntityOnActiveScene: Story = { args: { subject: { type: 'entity', link }, titleId: 'entity-link-l1', scenePage: false } }
