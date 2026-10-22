import { HandoutFileField } from '@/scenario-preparation/components/handout-file-field/handout-file-field'
import type { HandoutFileFamily } from '@/scenario-preparation/services/handoutFile'
import { HANDOUT_KIND_FAMILIES, type HandoutFileDetails, type HandoutKind } from '@/scenario-preparation/types/Handout'
import { RichTextEditor } from '@/shared/components/rich-text-editor/rich-text-editor'
import { Label } from '@/shared/components/ui/label'
import type { RichTextDocument } from '@/shared/types/RichText'

const TEXT_HINT = 'You can format text and add links.'

export interface HandoutContentFieldIds {
  content: string
  contentLabel: string
  contentHint: string
  contentError: string
  file: string
  fileError: string
}

interface HandoutContentFieldProps {
  /** The chosen kind decides the field; null before a kind is chosen. */
  kind: HandoutKind | null
  ids: HandoutContentFieldIds
  textInitialValue: RichTextDocument | null
  onTextChange: (value: RichTextDocument | null) => void
  /** The image and the PDF chosen so far, kept per family while the kind switches (SP-UX-87). */
  files: Record<HandoutFileFamily, File | null>
  onFileChange: (family: HandoutFileFamily, file: File | null) => void
  storedFile?: HandoutFileDetails | null
  contentError?: string
  fileError?: string
}

/**
 * The content field of the add and edit form, by the family of the kind (specs/scenario-preparation/ux.md section 51): the
 * rich-text editor, the image or PDF input, or a muted line before a kind is chosen. It follows the Kind fieldset and never moves focus.
 */
export function HandoutContentField(props: HandoutContentFieldProps) {
  const { kind, ids } = props
  if (kind === null) {
    return <p className="text-sm text-muted-foreground">Choose a kind to add its content.</p>
  }

  const family = HANDOUT_KIND_FAMILIES[kind]
  if (family !== 'richText') {
    return (
      <HandoutFileField
        family={family}
        file={props.files[family]}
        onChange={(file) => props.onFileChange(family, file)}
        stored={props.storedFile}
        error={props.fileError}
        inputId={ids.file}
        errorId={ids.fileError}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Label id={ids.contentLabel} htmlFor={ids.content} onClick={() => document.getElementById(ids.content)?.focus()}>
        Text
      </Label>
      <RichTextEditor
        id={ids.content}
        labelledBy={ids.contentLabel}
        describedBy={props.contentError ? `${ids.contentHint} ${ids.contentError}` : ids.contentHint}
        invalid={Boolean(props.contentError)}
        initialValue={props.textInitialValue}
        onChange={props.onTextChange}
      />
      <p id={ids.contentHint} className="text-sm text-muted-foreground">
        {TEXT_HINT}
      </p>
      {props.contentError && (
        <p id={ids.contentError} className="text-sm text-destructive">
          {props.contentError}
        </p>
      )}
    </div>
  )
}
