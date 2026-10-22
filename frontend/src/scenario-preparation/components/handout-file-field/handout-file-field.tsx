import { useEffect, useRef } from 'react'

import { formatFileSize, HANDOUT_FILE_ACCEPT, type HandoutFileFamily } from '@/scenario-preparation/services/handoutFile'
import type { HandoutFileDetails } from '@/scenario-preparation/types/Handout'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useObjectUrl } from '@/shared/hooks/useObjectUrl'

const COPY: Record<HandoutFileFamily, { label: string; replaceLabel: string; noun: string; hint: string }> = {
  picture: { label: 'Image', replaceLabel: 'Replace image', noun: 'image', hint: 'PNG, JPEG, WebP, or GIF, up to 20 MB.' },
  document: { label: 'Document', replaceLabel: 'Replace document', noun: 'document', hint: 'PDF, up to 20 MB.' },
}

interface HandoutFileFieldProps {
  family: HandoutFileFamily
  /** The image or PDF chosen so far; kept by the form when the kind switches away and back. */
  file: File | null
  onChange: (file: File | null) => void
  /** The file an edit starts from, shown as "Current image: ..." with an optional replacement. */
  stored?: HandoutFileDetails | null
  error?: string
  inputId: string
  errorId: string
}

function Preview({ file, family }: { file: File; family: HandoutFileFamily }) {
  const url = useObjectUrl(family === 'picture' ? file : null)

  return (
    <div className="flex flex-col gap-2">
      {url && <img src={url} alt={`Preview of ${file.name}`} className="max-h-60 max-w-full object-contain object-left" />}
      <p className="text-sm break-words text-muted-foreground">
        {file.name}, {formatFileSize(file.size)}
      </p>
    </div>
  )
}

/**
 * The native input for an Image, Map, or Document Handout file (specs/scenario-preparation/ux.md section 51): a visible
 * label, the format hint, the error, and a preview of the chosen file. On an edit it shows the current file and an optional
 * replacement.
 */
export function HandoutFileField({ family, file, onChange, stored, error, inputId, errorId }: HandoutFileFieldProps) {
  const copy = COPY[family]
  const hintId = `${inputId}-hint`
  const keepId = `${inputId}-keep`
  const inputRef = useRef<HTMLInputElement>(null)

  // The input is new when the kind switches back to this family, so the file chosen before is put back into it.
  useEffect(() => {
    const input = inputRef.current
    if (input && file && input.files?.length === 0 && typeof DataTransfer !== 'undefined') {
      const transfer = new DataTransfer()
      transfer.items.add(file)
      input.files = transfer.files
    }
    // Only when the input appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const describedBy = [stored ? keepId : null, hintId, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-2">
      {stored && (
        <p className="text-sm break-words">
          Current {copy.noun}: {stored.name}, {formatFileSize(stored.sizeBytes)}
        </p>
      )}
      <Label htmlFor={inputId}>{stored ? copy.replaceLabel : copy.label}</Label>
      {stored && (
        <p id={keepId} className="text-sm text-muted-foreground">
          Leave empty to keep the current {copy.noun}.
        </p>
      )}
      <p id={hintId} className="text-sm text-muted-foreground">
        {copy.hint}
      </p>
      <Input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={HANDOUT_FILE_ACCEPT[family]}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="h-auto cursor-pointer py-2"
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {file && <Preview file={file} family={family} />}
    </div>
  )
}
