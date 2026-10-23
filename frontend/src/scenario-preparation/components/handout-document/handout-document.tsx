import { HandoutFileFailure, HandoutFileLoading } from '@/scenario-preparation/components/handout-file-status/handout-file-status'
import { useHandoutFile } from '@/scenario-preparation/hooks/useHandouts'
import { formatFileSize } from '@/scenario-preparation/services/handoutFile'
import type { HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import type { FileHandout } from '@/scenario-preparation/types/Handout'
import { buttonVariants } from '@/shared/components/ui/button'
import { useObjectUrl } from '@/shared/hooks/useObjectUrl'

interface HandoutDocumentProps {
  owner: HandoutOwner
  handout: FileHandout
}

/**
 * The content of a Document Handout (specs/scenario-preparation/ux.md section 53): its name, "PDF, {size}", and "Open" and
 * "Download". The PDF loads with the page so both are plain links on its object URL; there is no inline preview.
 */
export function HandoutDocument({ owner, handout }: HandoutDocumentProps) {
  const file = useHandoutFile(owner, handout.id, true)
  const url = useObjectUrl(file.data)

  let body
  if (file.data) {
    body = url ? <LoadedDocument url={url} handout={handout} /> : <HandoutFileLoading />
  } else if (file.isError || file.errorUpdatedAt > 0) {
    body = <HandoutFileFailure message="We couldn't load the document." retrying={file.isFetching} onRetry={() => void file.refetch()} />
  } else {
    body = <HandoutFileLoading />
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Document</h2>
      {body}
    </section>
  )
}

function LoadedDocument({ url, handout }: { url: string; handout: FileHandout }) {
  const { name, sizeBytes } = handout.file
  const newTabNote = `${handout.id}-new-tab`

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="break-words">{name}</p>
        <p className="text-sm text-muted-foreground">PDF, {formatFileSize(sizeBytes)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${name}`}
          aria-describedby={newTabNote}
          className={buttonVariants({ variant: 'outline' })}
        >
          Open
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
