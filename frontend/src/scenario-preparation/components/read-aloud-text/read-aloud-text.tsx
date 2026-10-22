import { BookOpenText } from 'lucide-react'
import { useId } from 'react'

import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import type { RichTextDocument } from '@/shared/types/RichText'

interface ReadAloudTextProps {
  document: RichTextDocument
}

/**
 * A Read-aloud Handout's text in its panel (specs/scenario-preparation/ux.md section 42): a section labelled by its visible
 * h2 "Read-aloud", with a left rule and a muted background. The heading, not the colour, says what it is (SP-A11Y-38). The
 * text's own headings stay h3 and h4 under the h2.
 */
export function ReadAloudText({ document }: ReadAloudTextProps) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 border-l-4 border-primary bg-muted p-4">
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <BookOpenText aria-hidden="true" className="size-5" />
        Read-aloud
      </h2>
      <RichTextView document={document} />
    </section>
  )
}
