import { useId, useState } from 'react'

import { RevealedContent } from '@/scene-play/components/revealed-content/revealed-content'
import { formatRevealTime, recipientNames, revealKindLabel } from '@/scene-play/services/revealPresentation'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'

interface RevealedInSceneSectionProps {
  campaignId: string
  /** Every Reveal of the Active Scene, newest first. */
  reveals: KeeperReveal[]
}

/** "Revealed in this Scene" on the Keeper's page (specs/scene-play/ux.md section 12): each Reveal as revealed, newest first. */
export function RevealedInSceneSection({ campaignId, reveals }: RevealedInSceneSectionProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        Revealed in this Scene
      </h2>
      {reveals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing has been revealed in this Scene yet.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {reveals.map((reveal) => (
            <RevealEntry key={reveal.revealId} campaignId={campaignId} reveal={reveal} />
          ))}
        </ol>
      )}
    </section>
  )
}

function RevealEntry({ campaignId, reveal }: { campaignId: string; reveal: KeeperReveal }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <li className="flex flex-col gap-2 border-t pt-3">
        <h3 className="text-base font-semibold break-words">{reveal.title}</h3>
        <p className="text-sm break-words text-muted-foreground">
          {revealKindLabel(reveal)} <span aria-hidden="true">&middot;</span> <time dateTime={reveal.revealedAt}>{formatRevealTime(reveal.revealedAt)}</time>{' '}
          <span aria-hidden="true">&middot;</span> to {recipientNames(reveal)}
        </p>
        <div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label={`${open ? 'Hide' : 'Show'} what was revealed: ${reveal.title}`}>
              {open ? 'Hide what was revealed' : 'Show what was revealed'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <RevealedContent campaignId={campaignId} reveal={reveal} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}
