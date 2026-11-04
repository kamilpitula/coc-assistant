import { formatRevealTime, recipientNames, revealKindLabel } from '@/scene-play/services/revealPresentation'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

interface RevealMetaLineProps {
  reveal: KeeperReveal
}

/**
 * "{kind} . {time} . to {names}" under a Reveal's title (specs/navigation/ux.md section 3), shared by "Revealed in this
 * Scene" and the reveal side panel (PBI-NAV-002 design record D4).
 */
export function RevealMetaLine({ reveal }: RevealMetaLineProps) {
  return (
    <p className="text-sm break-words text-muted-foreground">
      {revealKindLabel(reveal)} <span aria-hidden="true">&middot;</span> <time dateTime={reveal.revealedAt}>{formatRevealTime(reveal.revealedAt)}</time>{' '}
      <span aria-hidden="true">&middot;</span> to {recipientNames(reveal)}
    </p>
  )
}
