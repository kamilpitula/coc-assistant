import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { RevealedContent } from '@/scene-play/components/revealed-content/revealed-content'
import { formatRevealTime, revealKindLabel } from '@/scene-play/services/revealPresentation'
import type { PlayerReveal } from '@/scene-play/types/Reveal'

interface RevealedToSectionProps {
  campaignId: string
  /** The name of the Player's own Investigator; null is shown as "Unnamed Investigator". */
  investigatorName: string
  reveals: PlayerReveal[]
}

/**
 * "Revealed to {name}" on a present Player's Active Scene page (specs/scene-play/ux.md section 14): the link to the Player's Clues,
 * then the Reveals that reached their Investigator in this Scene, newest first, each an article labelled by its h3.
 */
export function RevealedToSection({ campaignId, investigatorName, reveals }: RevealedToSectionProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 id={headingId} className="text-lg font-semibold break-words">
          Revealed to {investigatorName}
        </h2>
        <Link to="/campaigns/$campaignId/investigator/clues" params={{ campaignId }} className="w-fit text-sm font-medium break-words underline underline-offset-4">
          {investigatorName}&apos;s Clues
        </Link>
      </div>
      {reveals.length === 0 ? (
        <p className="text-sm text-muted-foreground">The Keeper hasn&apos;t revealed anything to {investigatorName} yet.</p>
      ) : (
        reveals.map((reveal) => <RevealArticle key={reveal.revealId} campaignId={campaignId} reveal={reveal} />)
      )}
    </section>
  )
}

function RevealArticle({ campaignId, reveal }: { campaignId: string; reveal: PlayerReveal }) {
  const titleId = useId()

  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-2 border-t pt-4">
      <h3 id={titleId} className="text-base font-semibold break-words">
        {reveal.title}
      </h3>
      <p className="text-sm text-muted-foreground">
        {revealKindLabel(reveal)} <span aria-hidden="true">&middot;</span> Revealed <time dateTime={reveal.revealedAt}>{formatRevealTime(reveal.revealedAt)}</time>
      </p>
      <RevealedContent campaignId={campaignId} reveal={reveal} />
    </article>
  )
}
