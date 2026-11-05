import { useId, useState } from 'react'

import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { isEmptyRichText } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

interface KeeperNotesSectionProps {
  /** The Scene's Keeper notes, or null when it has none. */
  notes: RichTextDocument | null
}

/**
 * The Scene's Keeper notes on the Keeper's Active Scene page (specs/scene-play/ux.md section 21.3): read-only and open
 * until "Hide Keeper notes". The notes never reach a Player.
 */
export function KeeperNotesSection({ notes }: KeeperNotesSectionProps) {
  const headingId = useId()
  const [open, setOpen] = useState(true)
  const hasNotes = notes !== null && !isEmptyRichText(notes)

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section aria-labelledby={headingId} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id={headingId} className="text-lg font-semibold">
            Keeper notes
          </h2>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              {open ? 'Hide Keeper notes' : 'Show Keeper notes'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {hasNotes ? <RichTextView document={notes} headingOffset={1} /> : <p className="text-sm text-muted-foreground">No Keeper notes.</p>}
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
