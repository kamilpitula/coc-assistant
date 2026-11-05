import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { createElement } from 'react'

import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import type { HandoutOwnerDescription } from '@/scenario-preparation/services/handoutOwner'
import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import { NON_PLAYER_ENTITY_TYPE_LABELS } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { useSidePanel } from '@/shared/hooks/useSidePanel'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import type { OpenPanel } from '@/shared/components/side-panel/sidePanelParams'
import { useHeadingTag, type HeadingLevel } from '@/shared/providers/heading-offset/heading-offset-context'

/** Where an Item title links: its Item page. */
export interface MaterialEntryItemPage {
  to: '/campaigns/$campaignId/items/$itemId'
  params: { campaignId: string; itemId: string }
}

/** Where an entry title links when the host page has no panel: a Handout page or an Item page. */
export type MaterialEntryPage = ReturnType<HandoutOwnerDescription['handoutPage']> | MaterialEntryItemPage

/**
 * One entry's subject (specs/scenario-preparation/ux.md section 72, PBI-SPL-005 design record D2, Strategy): the
 * subject's own record, with a page only when the host has no panel for it (Item Handouts, Items until PBI-SPL-003).
 */
export type MaterialEntrySubject =
  | { type: 'handout'; handout: HandoutSummary; page?: MaterialEntryPage }
  | { type: 'entity'; link: NonPlayerEntityLink }
  | { type: 'item'; link: ItemLink; page: MaterialEntryPage }

interface MaterialEntryProps {
  subject: MaterialEntrySubject
  /** The focus target id after a create or link: on the title button, or on the title link when the host has no panel. */
  titleId: string
  headingLevel?: HeadingLevel
  /** Pure status content under the second line: the reveal status on the Active Scene, nothing on the Scene page. */
  status?: ReactNode
  /** The context's actions, right of the text: move controls, Edit and Unlink, or a Reveal trigger. */
  action?: ReactNode
}

/**
 * One Scene Handout, Non-Player Entity link, or Item (specs/scenario-preparation/ux.md section 72): the title in its
 * heading, the second line by subject, and the status and action slots. A title with a page links to it; otherwise it
 * opens the subject's side panel.
 */
export function MaterialEntry({ subject, titleId, headingLevel = 3, status, action }: MaterialEntryProps) {
  const tag = useHeadingTag(headingLevel)

  return (
    <li className="flex flex-col gap-2 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
        {createElement(tag, { className: 'text-base font-semibold break-words' }, <EntryTitle subject={subject} titleId={titleId} />)}
        <SecondLine subject={subject} />
        {status}
      </div>
      {action}
    </li>
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
  }
}

function EntryTitle({ subject, titleId }: { subject: MaterialEntrySubject; titleId: string }) {
  switch (subject.type) {
    case 'handout':
      return subject.page === undefined ? (
        <PanelTitleButton subject={subject} titleId={titleId} />
      ) : (
        <Link id={titleId} {...subject.page} className="min-h-6 min-w-0 break-words hover:underline">
          {subject.handout.title}
        </Link>
      )
    case 'entity':
      return <PanelTitleButton subject={subject} titleId={titleId} />
    case 'item':
      return (
        <Link id={titleId} {...subject.page} className="min-h-6 min-w-0 break-words hover:underline">
          {subject.link.item.name}
        </Link>
      )
  }
}

/** A title that opens a side panel: only Handouts and Non-Player Entity links, until PBI-SPL-003 adds an item panel. */
type PanelSubject = Extract<MaterialEntrySubject, { type: 'handout' | 'entity' }>

/** The panel-opening title, on its own so `useSidePanel` (and its scope) is only needed where a host exists. */
function PanelTitleButton({ subject, titleId }: { subject: PanelSubject; titleId: string }) {
  const { open } = useSidePanel()

  return (
    <button
      id={titleId}
      type="button"
      aria-haspopup="dialog"
      onClick={(event) => open(panelOf(subject), event.currentTarget)}
      className="min-h-6 min-w-0 cursor-pointer break-words hover:underline"
    >
      {titleOf(subject)}
    </button>
  )
}

/** The panel a title opens (PBI-SPL-005 design record D2, Strategy): a new subject with a panel adds one entry. */
function panelOf(subject: PanelSubject): OpenPanel {
  switch (subject.type) {
    case 'handout':
      return { type: 'handout', handoutId: subject.handout.id }
    case 'entity':
      return { type: 'entity', linkId: subject.link.id }
  }
}

/** The second line by subject (specs/scenario-preparation/ux.md section 72, Strategy). */
function SecondLine({ subject }: { subject: MaterialEntrySubject }) {
  switch (subject.type) {
    case 'handout':
      return <HandoutBadges kind={subject.handout.kind} visibility={subject.handout.visibility} />
    case 'entity':
      return (
        <p className="text-sm break-words text-muted-foreground">
          {NON_PLAYER_ENTITY_TYPE_LABELS[subject.link.nonPlayerEntity.type]}: {subject.link.nonPlayerEntity.name}
        </p>
      )
    case 'item':
      return (
        <span>
          <Badge variant="secondary">Item</Badge>
        </span>
      )
  }
}

interface MaterialEntryListProps {
  as: 'ol' | 'ul'
  children: ReactNode
}

/** The entries of one list in one bordered container, each row separated by a top border. */
export function MaterialEntryList({ as: Tag, children }: MaterialEntryListProps) {
  return (
    <Card>
      <Tag className="flex flex-col gap-2 divide-y px-4 py-2">{children}</Tag>
    </Card>
  )
}
