import { HandoutFileFailure, HandoutFileLoading } from '@/scenario-preparation/components/handout-file-status/handout-file-status'
import { useHandoutFile } from '@/scenario-preparation/hooks/useHandouts'
import { formatFileSize } from '@/scenario-preparation/services/handoutFile'
import type { HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { HANDOUT_KIND_LABELS, type FileHandout } from '@/scenario-preparation/types/Handout'
import { buttonVariants } from '@/shared/components/ui/button'
import { useObjectUrl } from '@/shared/hooks/useObjectUrl'

interface HandoutImageProps {
  owner: HandoutOwner
  handout: FileHandout
}

/**
 * The content of an Image or Map Handout (specs/scenario-preparation/ux.md section 52): the image fetched with the bearer token,
 * its name and size, and "Open full size" and "Download". A Map spans the content width; an Image is capped at 70vh.
 */
export function HandoutImage({ owner, handout }: HandoutImageProps) {
  const file = useHandoutFile(owner, handout.id, true)
  const url = useObjectUrl(file.data)
  const heading = HANDOUT_KIND_LABELS[handout.kind]

  let body
  if (file.data) {
    body = url ? <LoadedImage url={url} handout={handout} /> : <HandoutFileLoading />
  } else if (file.isError || file.errorUpdatedAt > 0) {
    body = <HandoutFileFailure message="We couldn't load the image." retrying={file.isFetching} onRetry={() => void file.refetch()} />
  } else {
    body = <HandoutFileLoading />
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {body}
    </section>
  )
}

function LoadedImage({ url, handout }: { url: string; handout: FileHandout }) {
  const { name, sizeBytes } = handout.file
  const newTabNote = `${handout.id}-new-tab`

  return (
    <>
      <figure className="flex flex-col gap-2">
        <img
          src={url}
          alt={handout.title}
          className={handout.kind === 'Map' ? 'h-auto w-full' : 'h-auto max-h-[70vh] max-w-full object-contain object-left'}
        />
        <figcaption className="text-sm break-words text-muted-foreground">
          {name}, {formatFileSize(sizeBytes)}
        </figcaption>
      </figure>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${handout.title} full size`}
          aria-describedby={newTabNote}
          className={buttonVariants({ variant: 'outline' })}
        >
          Open full size
        </a>
        <span id={newTabNote} className="sr-only">
          Opens in a new tab
        </span>
        <a href={url} download={name} aria-label={`Download ${name}`} className={buttonVariants({ variant: 'outline' })}>
          Download
        </a>
      </div>
    </>
  )
}
