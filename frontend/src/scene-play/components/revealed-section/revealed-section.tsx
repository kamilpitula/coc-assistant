import { useId } from 'react'

import { RevealMetaLine } from '@/scene-play/components/reveal-meta-line/reveal-meta-line'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { Button } from '@/shared/components/ui/button'
import { useSidePanel } from '@/shared/hooks/useSidePanel'

interface RevealedSectionProps {
  /** The Reveals of fully revealed subjects, newest first (specs/scene-play/ux.md section 21.6). */
  reveals: KeeperReveal[]
}

/**
 * The "Revealed" sub-tab body (specs/scene-play/ux.md section 21.6): every Reveal in this Scene, newest first. "Show
 * what was revealed" opens the `reveal` side panel instead of expanding inline; the page beneath keeps its state.
 */
export function RevealedSection({ reveals }: RevealedSectionProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} tabIndex={-1} className="text-lg font-semibold outline-none">
          Revealed
        </h2>
        <p className="text-sm text-muted-foreground">Every Reveal in this Scene, newest first.</p>
      </div>
      {reveals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has been revealed in this Scene yet.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {reveals.map((reveal) => (
            <RevealEntry key={reveal.revealId} reveal={reveal} />
          ))}
        </ol>
      )}
    </section>
  )
}

function RevealEntry({ reveal }: { reveal: KeeperReveal }) {
  const { open } = useSidePanel()

  return (
    <li className="flex flex-col gap-2 border-t pt-3">
      <h3 className="text-base font-semibold break-words">{reveal.title}</h3>
      <RevealMetaLine reveal={reveal} />
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Show what was revealed: ${reveal.title}`}
          onClick={(event) => open({ type: 'reveal', revealId: reveal.revealId }, event.currentTarget)}
        >
          Show what was revealed
        </Button>
      </div>
    </li>
  )
}
