import { HandoutDocument } from '@/scenario-preparation/components/handout-document/handout-document'
import { HandoutImage } from '@/scenario-preparation/components/handout-image/handout-image'
import { useHandout, useHandoutFile } from '@/scenario-preparation/hooks/useHandouts'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { isFileHandout, type FileHandout, type Handout } from '@/scenario-preparation/types/Handout'
import { ReadAloudText } from '@/shared/components/read-aloud-text/read-aloud-text'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface HandoutPreviewProps {
  owner: SceneHandoutOwner
  handoutId: string
}

/**
 * A Handout's current content in a side panel body (specs/navigation/ux.md section 3), loaded when first opened. It
 * differs from the Handout page only in its headings: they start at h4 under the entry's h3 (SPL-A11Y-8).
 */
export function HandoutPreview({ owner, handoutId }: HandoutPreviewProps) {
  const handout = useHandout(owner, handoutId, true)

  if (handout.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm">We couldn&apos;t load this Handout.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void handout.refetch()}>
          Try again
        </Button>
      </div>
    )
  }
  if (handout.data === null) {
    return <p className="text-sm text-muted-foreground">This Handout is gone.</p>
  }
  if (!handout.data) {
    return <Skeleton aria-busy="true" className="h-20 w-full" />
  }

  return <PreviewContent owner={owner} handout={handout.data} />
}

function PreviewContent({ owner, handout }: { owner: SceneHandoutOwner; handout: Handout }) {
  if (isFileHandout(handout)) {
    return <FilePreview owner={owner} handout={handout} />
  }

  return handout.kind === 'ReadAloud' ? <ReadAloudText document={handout.content} showHeading={false} /> : <RichTextView document={handout.content} headingOffset={1} />
}

function FilePreview({ owner, handout }: { owner: SceneHandoutOwner; handout: FileHandout }) {
  const file = useHandoutFile(owner, handout.id, true)

  return handout.kind === 'Document' ? (
    <HandoutDocument handout={handout} fileQuery={file} showHeading={false} />
  ) : (
    <HandoutImage handout={handout} fileQuery={file} alt={handout.imageDescription ?? handout.title} showHeading={false} showDescription />
  )
}
