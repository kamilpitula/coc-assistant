import { useId, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { isAllowedLinkUrl } from '@/shared/services/richText'

const INVALID_URL = 'Enter a web address that starts with http:// or https://.'

interface RichTextLinkDialogProps {
  open: boolean
  /** The address of the link being edited, or null when adding a link. */
  editingUrl: string | null
  onSave: (url: string) => void
  onRemove: () => void
  /** Closes the dialog without a change. */
  onClose: () => void
  /** Called as the dialog closes so the editor gets focus back (SP-A11Y-15). */
  onCloseFocus: () => void
}

/** Adds, edits, or removes a link; accepts only http and https addresses (specs/scenario-preparation/ux.md section 15). */
export function RichTextLinkDialog({ open, editingUrl, onSave, onRemove, onClose, onCloseFocus }: RichTextLinkDialogProps) {
  const editing = editingUrl !== null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit link' : 'Add link'}</DialogTitle>
          <DialogDescription className="sr-only">Links open in a new tab.</DialogDescription>
        </DialogHeader>
        <LinkForm initialUrl={editingUrl ?? ''} editing={editing} onSave={onSave} onRemove={onRemove} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  )
}

interface LinkFormProps {
  initialUrl: string
  editing: boolean
  onSave: (url: string) => void
  onRemove: () => void
  onCancel: () => void
}

function LinkForm({ initialUrl, editing, onSave, onRemove, onCancel }: LinkFormProps) {
  const fieldId = useId()
  const errorId = useId()
  const field = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The dialog is portaled, but React still bubbles its events to the form that holds the editor.
    event.stopPropagation()
    const trimmed = url.trim()
    if (!isAllowedLinkUrl(trimmed)) {
      setError(INVALID_URL)
      field.current?.focus()
      return
    }
    onSave(trimmed)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId}>Web address</Label>
        {/* Focus goes to the field when the dialog opens (SP-A11Y-15). */}
        <Input
          id={fieldId}
          ref={field}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="submit">Save link</Button>
        {editing && (
          <Button type="button" variant="outline" onClick={onRemove}>
            Remove link
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </DialogFooter>
    </form>
  )
}
