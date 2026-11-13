import { CircleAlert } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'

import type { RollGroup } from '@/campaign-play/types/CharacterSheet'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'

/** The longest Change Request comment (specs/character-sheet/ux.md section 12, decided 2026-10-02). */
const COMMENT_MAX_LENGTH = 2000

/** The grant checkbox labels (specs/character-sheet/ux.md section 7.1). */
const GRANT_LABELS: Record<RollGroup, string> = {
  Characteristics: 'Characteristics',
  Luck: 'Luck',
  EduImprovementChecks: 'EDU checks',
}

interface RequestChangesDialogProps {
  pending: boolean
  /** The groups the dialog may offer a re-roll grant for: every group with a current Roll Record. */
  grantableGroups: RollGroup[]
  /** Sends the comment with the selected grants; resolves true once sent, so the dialog closes. */
  onSend: (comment: string, rerollGrants: RollGroup[]) => Promise<boolean>
}

/** "Request changes" with a required comment and an optional re-roll grant (specs/character-sheet/ux.md section 7.1; UX-15, UX-39, A11Y-8). */
export function RequestChangesDialog({ pending, grantableGroups, onSend }: RequestChangesDialogProps) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [grants, setGrants] = useState<RollGroup[]>([])
  const [error, setError] = useState<string>()
  const commentId = useId()
  const counterId = useId()
  const errorId = useId()

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setComment('')
      setGrants([])
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

    if (await onSend(comment, grants)) {
      setOpen(false)
    }
  }

  const toggleGrant = (group: RollGroup, checked: boolean) => {
    setGrants(checked ? [...grants, group] : grants.filter((grant) => grant !== group))
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
          {grantableGroups.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Allow the Player to roll again</legend>
              <p className="text-sm text-muted-foreground">Their current results stay visible to you and stop counting.</p>
              {grantableGroups.map((group) => {
                const checkboxId = `reroll-grant-${group}`
                return (
                  <div key={group} className="flex min-h-6 items-center gap-2">
                    <Checkbox
                      id={checkboxId}
                      checked={grants.includes(group)}
                      onCheckedChange={(checked) => toggleGrant(group, checked === true)}
                    />
                    <Label htmlFor={checkboxId}>{GRANT_LABELS[group]}</Label>
                  </div>
                )
              })}
            </fieldset>
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
