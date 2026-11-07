import { createElement, useId } from 'react'

import { RevealDisclosure } from '@/scene-play/components/reveal-disclosure/reveal-disclosure'
import { groupCluesByScene } from '@/scene-play/services/cluesGrouping'
import { formatClueTime, revealKindLabel, UNNAMED_INVESTIGATOR } from '@/scene-play/services/revealPresentation'
import type { Clue, Clues } from '@/scene-play/types/Reveal'
import { useHeadingTag } from '@/shared/providers/heading-offset/heading-offset-context'

interface CluesListProps {
  campaignId: string
  clues: Clues
}

/**
 * An Investigator's Clues grouped by Scene (specs/scene-play/ux.md section 15), shared by the Clues page and the Clues
 * side panel (PBI-NAV-002 design record D4): each Clue closed until "Show". The headings shift with the enclosing
 * `HeadingOffsetProvider`, so the page keeps h2 groups and h3 Clues while the panel (+1) renders h3 and h4.
 */
export function CluesList({ campaignId, clues }: CluesListProps) {
  const name = clues.investigatorName ?? UNNAMED_INVESTIGATOR
  const groups = groupCluesByScene(clues.clues)

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{name} hasn&apos;t received any Clues yet.</p>
  }

  return (
    <>
      {groups.map((group) => (
        <SceneGroup key={group.sceneId} campaignId={campaignId} title={group.sceneTitle} clues={group.clues} />
      ))}
    </>
  )
}

function SceneGroup({ campaignId, title, clues }: { campaignId: string; title: string; clues: Clue[] }) {
  const headingId = useId()
  const tag = useHeadingTag(2)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      {createElement(tag, { id: headingId, className: 'text-lg font-semibold break-words' }, title)}
      {clues.map((clue) => (
        <ClueItem key={clue.revealId} campaignId={campaignId} clue={clue} />
      ))}
    </section>
  )
}

function ClueItem({ campaignId, clue }: { campaignId: string; clue: Clue }) {
  return (
    <RevealDisclosure
      campaignId={campaignId}
      reveal={clue}
      metaLine={
        <p className="text-sm text-muted-foreground">
          {revealKindLabel(clue)} <span aria-hidden="true">&middot;</span> Revealed{' '}
          <time dateTime={clue.revealedAt}>{formatClueTime(clue.revealedAt)}</time>
        </p>
      }
    />
  )
}
