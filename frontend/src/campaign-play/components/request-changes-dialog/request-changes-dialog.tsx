import { CircleAlert } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'

/** The longest Change Request comment (specs/character-sheet/ux.md section 12, decided 2026-10-02). */
const COMMENT_MAX_LENGTH = 2000

interface RequestChangesDialogProps {
  pending: boolean
  /** Sends the comment; resolves true once sent, so the dialog closes. */
  onSend: (comment: string) => Promise<boolean>
}

/** "Request changes" with a required comment (specs/character-sheet/ux.md section 7.1; UX-15, A11Y-8). */
export function RequestChangesDialog({ pending, onSend }: RequestChangesDialogProps) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()
  const commentId = useId()
  const counterId = useId()
  const errorId = useId()

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setComment('')
      setError(undefined)
    }
    setOpen(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (comment.trim() === '') {
      setError('Write what the Player should change.')
      return
    }

    if (await onSend(comment)) {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" disabled={pending}>
          Request changes
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Request changes</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <label htmlFor={commentId} className="text-sm font-medium">
            What should the Player change?
          </label>
          <Textarea
            id={commentId}
            value={comment}
            maxLength={COMMENT_MAX_LENGTH}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={[counterId, error ? errorId : null].filter(Boolean).join(' ')}
            onChange={(event) => setComment(event.target.value)}
          />
          <p id={counterId} className="text-sm text-muted-foreground">
            {comment.length} of {COMMENT_MAX_LENGTH} characters
          </p>
          {error && (
            <p id={errorId} className="flex items-center gap-1 text-sm text-destructive">
              <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Sending...' : 'Send to Player'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
