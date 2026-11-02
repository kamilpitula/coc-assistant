import { HandoutFileFailure, HandoutFileLoading } from '@/scenario-preparation/components/handout-file-status/handout-file-status'
import { formatFileSize } from '@/scenario-preparation/services/handoutFile'
import type { FileQuery } from '@/scenario-preparation/types/FileQuery'
import { HANDOUT_KIND_LABELS, type FileHandout } from '@/scenario-preparation/types/Handout'
import { buttonVariants } from '@/shared/components/ui/button'
import { useObjectUrl } from '@/shared/hooks/useObjectUrl'

/** What the image view reads of a Handout or of a Reveal's snapshot. */
export type ImageSource = Pick<FileHandout, 'id' | 'kind' | 'title' | 'file'> & { imageDescription?: string | null }

interface HandoutImageProps {
  handout: ImageSource
  /** The query of the stored file: the Keeper's current file, or a Reveal's snapshot (D8). */
  fileQuery: FileQuery
  /** The image description, or the title when there is none (SP-A11Y-59). */
  alt: string
  /** The kind heading above the image; false inside a Reveal, whose own heading names it. Default true. */
  showHeading?: boolean
  /** "Image description: {text}" below the caption, on the Keeper's Handout page. Default false. */
  showDescription?: boolean
}

/**
 * The content of an Image or Map Handout (specs/scenario-preparation/ux.md section 52): the image fetched with the bearer token,
 * its name and size, and "Open full size" and "Download". A Map spans the content width; an Image is capped at 70vh.
 */
export function HandoutImage({ handout, fileQuery: file, alt, showHeading = true, showDescription = false }: HandoutImageProps) {
  const url = useObjectUrl(file.data)
  const heading = HANDOUT_KIND_LABELS[handout.kind]

  let body
  if (file.data) {
    body = url ? <LoadedImage url={url} handout={handout} alt={alt} showDescription={showDescription} /> : <HandoutFileLoading />
  } else if (file.isError || file.errorUpdatedAt > 0) {
    body = <HandoutFileFailure message="We couldn't load the image." retrying={file.isFetching} onRetry={() => void file.refetch()} />
  } else {
    body = <HandoutFileLoading />
  }

  return (
    <section className="flex flex-col gap-3">
      {showHeading && <h2 className="text-lg font-semibold">{heading}</h2>}
      {body}
    </section>
  )
}

interface LoadedImageProps {
  url: string
  handout: ImageSource
  alt: string
  showDescription: boolean
}

function LoadedImage({ url, handout, alt, showDescription }: LoadedImageProps) {
  const { name, sizeBytes } = handout.file
  const newTabNote = `${handout.id}-new-tab`

  return (
    <>
      <figure className="flex flex-col gap-2">
        <img
          src={url}
          alt={alt}
          className={handout.kind === 'Map' ? 'h-auto w-full' : 'h-auto max-h-[70vh] max-w-full object-contain object-left'}
        />
        <figcaption className="text-sm break-words text-muted-foreground">
          {name}, {formatFileSize(sizeBytes)}
        </figcaption>
        {showDescription && handout.imageDescription && (
          <p className="text-sm break-words text-muted-foreground">Image description: {handout.imageDescription}</p>
        )}
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
