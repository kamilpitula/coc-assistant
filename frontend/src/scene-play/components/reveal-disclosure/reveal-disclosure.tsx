import { createElement, useId, useState, type ReactNode } from 'react'

import { RevealedContent } from '@/scene-play/components/revealed-content/revealed-content'
import type { PlayerReveal } from '@/scene-play/types/Reveal'
import { useHeadingTag } from '@/shared/providers/heading-offset/heading-offset-context'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'

interface RevealDisclosureProps {
  campaignId: string
  reveal: PlayerReveal
  /** The muted line under the title, in the caller's specified words (a Clue's or a history Reveal's). */
  metaLine: ReactNode
}

/**
 * One revealed subject, closed until "Show" (specs/scene-play/ux.md sections 15 and 23.2): the Clues page and the Scene
 * History share this disclosure, each with its own meta line. The headings shift with the enclosing
 * `HeadingOffsetProvider`, so the page keeps Reveals at h3 while a panel (+1) renders h4.
 */
export function RevealDisclosure({ campaignId, reveal, metaLine }: RevealDisclosureProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const tag = useHeadingTag(3)

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <article aria-labelledby={titleId} className="flex flex-col gap-2 border-t pt-4">
        {createElement(tag, { id: titleId, className: 'text-base font-semibold break-words' }, reveal.title)}
        {metaLine}
        <div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label={`${open ? 'Hide' : 'Show'} ${reveal.title}`}>
              {open ? 'Hide' : 'Show'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <RevealedContent campaignId={campaignId} reveal={reveal} />
        </CollapsibleContent>
      </article>
    </Collapsible>
  )
}
