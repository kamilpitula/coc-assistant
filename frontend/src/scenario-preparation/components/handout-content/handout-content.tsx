import { ReadAloudText } from '@/scenario-preparation/components/read-aloud-text/read-aloud-text'
import type { HandoutKind } from '@/scenario-preparation/types/Handout'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import type { RichTextDocument } from '@/shared/types/RichText'

interface HandoutContentProps {
  kind: HandoutKind
  content: RichTextDocument
}

/**
 * A Handout's text by kind (specs/scenario-preparation/ux.md section 42): a Read-aloud Handout in the read-aloud panel, a Text
 * Handout under an h2 "Text". Both keep the text's headings at h3 and h4.
 */
export function HandoutContent({ kind, content }: HandoutContentProps) {
  if (kind === 'ReadAloud') {
    return <ReadAloudText document={content} />
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Text</h2>
      <RichTextView document={content} />
    </section>
  )
}
