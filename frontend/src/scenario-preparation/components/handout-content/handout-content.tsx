import type { ComponentType } from 'react'

import { HandoutDocument } from '@/scenario-preparation/components/handout-document/handout-document'
import { HandoutImage } from '@/scenario-preparation/components/handout-image/handout-image'
import { ReadAloudText } from '@/scenario-preparation/components/read-aloud-text/read-aloud-text'
import type { HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { isFileHandout, type Handout, type HandoutKind } from '@/scenario-preparation/types/Handout'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'

interface HandoutContentProps {
  handout: Handout
  owner: HandoutOwner
}

function ReadAloudView({ handout }: HandoutContentProps) {
  return isFileHandout(handout) ? null : <ReadAloudText document={handout.content} />
}

function TextView({ handout }: HandoutContentProps) {
  if (isFileHandout(handout)) {
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Text</h2>
      <RichTextView document={handout.content} />
    </section>
  )
}

function ImageView({ handout, owner }: HandoutContentProps) {
  return isFileHandout(handout) ? <HandoutImage owner={owner} handout={handout} /> : null
}

function DocumentView({ handout, owner }: HandoutContentProps) {
  return isFileHandout(handout) ? <HandoutDocument owner={owner} handout={handout} /> : null
}

// One view per kind (ux.md section 56); a Map is the Image view with the full content width.
const VIEWS: Record<HandoutKind, ComponentType<HandoutContentProps>> = {
  ReadAloud: ReadAloudView,
  Text: TextView,
  Image: ImageView,
  Document: DocumentView,
  Map: ImageView,
}

/**
 * A Handout's content by kind (specs/scenario-preparation/ux.md sections 42, 52, and 53): a Read-aloud Handout in the read-aloud
 * panel, a Text Handout under an h2 "Text", an Image or Map as an image, a Document as a name with "Open" and "Download".
 */
export function HandoutContent(props: HandoutContentProps) {
  const View = VIEWS[props.handout.kind]
  return <View {...props} />
}
