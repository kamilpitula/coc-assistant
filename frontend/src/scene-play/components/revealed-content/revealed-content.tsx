import { HandoutDocument } from '@/scenario-preparation/components/handout-document/handout-document'
import { HandoutImage } from '@/scenario-preparation/components/handout-image/handout-image'
import { useRevealFile } from '@/scene-play/hooks/useReveals'
import type { PlayerReveal, RevealFileDetails } from '@/scene-play/types/Reveal'
import { ReadAloudText } from '@/shared/components/read-aloud-text/read-aloud-text'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { isEmptyRichText } from '@/shared/services/richText'

interface RevealedContentProps {
  campaignId: string
  reveal: PlayerReveal
}

/**
 * What a Reveal showed, rendered from its snapshot (specs/scene-play/ux.md section 14): Read-aloud in its panel, Text, an Item, and a
 * Non-Player Entity's Player-facing description as rich text, an Image capped at 70vh, a Map across the full content width, and a
 * Document with "Open" and "Download". Headings inside start at h4, under the Reveal's h3. A file is fetched from the Reveal's file
 * endpoint, and `alt` is the image description, or the title when there is none (SPL-A11Y-10).
 */
export function RevealedContent({ campaignId, reveal }: RevealedContentProps) {
  return (
    <div className={reveal.handoutKind === 'Map' ? 'w-full' : 'max-w-2xl'}>
      <Content campaignId={campaignId} reveal={reveal} />
    </div>
  )
}

function Content({ campaignId, reveal }: RevealedContentProps) {
  if (reveal.subjectType === 'NonPlayerEntity' || reveal.subjectType === 'Item') {
    return <Description reveal={reveal} />
  }

  switch (reveal.handoutKind) {
    case 'ReadAloud':
      return reveal.content ? <ReadAloudText document={reveal.content} showHeading={false} /> : null
    case 'Text':
      return <Description reveal={reveal} />
    case 'Image':
    case 'Map':
    case 'Document':
      return <FileContent campaignId={campaignId} reveal={reveal} />
    default:
      return null
  }
}

/** An Image, a Map, or a Document, fetched from the Reveal's file endpoint. */
function FileContent({ campaignId, reveal }: RevealedContentProps) {
  switch (reveal.handoutKind) {
    case 'Image':
    case 'Map':
      return reveal.file ? <RevealedImage campaignId={campaignId} reveal={reveal} file={reveal.file} kind={reveal.handoutKind} /> : null
    case 'Document':
      return reveal.file ? <RevealedDocument campaignId={campaignId} reveal={reveal} file={reveal.file} /> : null
    default:
      return null
  }
}

function Description({ reveal }: { reveal: PlayerReveal }) {
  return reveal.content && !isEmptyRichText(reveal.content) ? <RichTextView document={reveal.content} headingOffset={1} /> : null
}

interface RevealedFileProps {
  campaignId: string
  reveal: PlayerReveal
  file: RevealFileDetails
}

// A Map breaks out of the reading column to the full width of the main content (SPL-UX-27); an Image is capped.
function RevealedImage({ campaignId, reveal, file, kind }: RevealedFileProps & { kind: 'Image' | 'Map' }) {
  const query = useRevealFile(campaignId, reveal.revealId, true)

  return (
    <HandoutImage
      handout={{ id: reveal.revealId, kind, title: reveal.title, file }}
      fileQuery={query}
      alt={reveal.imageDescription ?? reveal.title}
      showHeading={false}
    />
  )
}

function RevealedDocument({ campaignId, reveal, file }: RevealedFileProps) {
  const query = useRevealFile(campaignId, reveal.revealId, true)

  return <HandoutDocument handout={{ id: reveal.revealId, file }} fileQuery={query} showHeading={false} />
}
