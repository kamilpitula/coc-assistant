import { CircleAlert } from 'lucide-react'
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import type { CampaignRole } from '@/campaign-play/types/Campaign'
import {
  WALL_ENTRY_TEXT_MAX_LENGTH,
  type NewWallEntry,
  type WallEntryVisibility,
} from '@/campaign-play/types/WallEntry'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Textarea } from '@/shared/components/ui/textarea'

/** The id of the text box, so the Wall can return focus to it. */
export const WALL_COMPOSER_TEXT_ID = 'wall-entry-text'

interface WallEntryComposerProps {
  viewerRole: CampaignRole
  pending: boolean
  /** The last post failed; the text stays in the box. */
  failed: boolean
  /** Sends the entry; resolves true once it is stored, so the box clears. */
  onSubmit: (entry: NewWallEntry) => Promise<boolean>
}

/** The compose box on the Wall (specs/campaign-wall/ux.md sections 2 and 4.2). */
export function WallEntryComposer({ viewerRole, pending, failed, onSubmit }: WallEntryComposerProps) {
  const [text, setText] = useState('')
  const [visibility, setVisibility] = useState<WallEntryVisibility>('Public')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const hintId = useId()
  const isKeeper = viewerRole === 'Keeper'
  const trimmed = text.trim()
  const tooLong = trimmed.length > WALL_ENTRY_TEXT_MAX_LENGTH
  const canPost = trimmed.length > 0 && !tooLong && !pending

  const submit = async () => {
    if (!canPost) {
      return
    }

    const entry: NewWallEntry = isKeeper ? { text: trimmed, visibility } : { text: trimmed }
    if (await onSubmit(entry)) {
      setText('')
      setVisibility('Public')
      textRef.current?.focus()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <Card className="p-4">
      <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <Label htmlFor={WALL_COMPOSER_TEXT_ID}>New Wall Entry</Label>
        <Textarea
          id={WALL_COMPOSER_TEXT_ID}
          ref={textRef}
          rows={3}
          value={text}
          aria-invalid={tooLong ? true : undefined}
          aria-describedby={hintId}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isKeeper ? (
          <VisibilityChoice value={visibility} onChange={setVisibility} />
        ) : (
          <p className="text-sm text-muted-foreground">Everyone in this Campaign can read this.</p>
        )}
        {failed && (
          <p role="alert" className="flex items-center gap-1 text-sm text-destructive">
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            We couldn&apos;t add your entry. Your text is still here. Try again.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id={hintId} className={tooLong ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
            {hintFor(trimmed.length, tooLong)}
          </p>
          <Button type="submit" disabled={!canPost}>
            {pending ? 'Adding...' : 'Add to the Wall'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function hintFor(length: number, tooLong: boolean): string {
  if (tooLong) {
    return `Wall Entries can be at most ${WALL_ENTRY_TEXT_MAX_LENGTH} characters.`
  }

  return length === 0 ? 'Write something to post.' : `${length} / ${WALL_ENTRY_TEXT_MAX_LENGTH}`
}

interface VisibilityChoiceProps {
  value: WallEntryVisibility
  onChange: (value: WallEntryVisibility) => void
}

/** The Keeper's "Who can read this?" choice; Public is the default. */
function VisibilityChoice({ value, onChange }: VisibilityChoiceProps) {
  const publicId = useId()
  const keeperOnlyId = useId()

  return (
    <div className="flex flex-col gap-2">
      <p id={`${publicId}-legend`} className="text-sm font-medium">
        Who can read this?
      </p>
      <RadioGroup
        aria-labelledby={`${publicId}-legend`}
        value={value}
        onValueChange={(next) => onChange(next as WallEntryVisibility)}
      >
        <VisibilityOption id={publicId} value="Public" label="Public" description="Players can read this." />
        <VisibilityOption id={keeperOnlyId} value="KeeperOnly" label="Keeper only" description="Only you can read this." />
      </RadioGroup>
    </div>
  )
}

interface VisibilityOptionProps {
  id: string
  value: WallEntryVisibility
  label: string
  description: string
}

function VisibilityOption({ id, value, label, description }: VisibilityOptionProps) {
  return (
    <div className="flex items-start gap-2">
      <RadioGroupItem id={id} value={value} aria-describedby={`${id}-description`} className="mt-1" />
      <div className="flex flex-col">
        <Label htmlFor={id}>{label}</Label>
        <span id={`${id}-description`} className="text-sm text-muted-foreground">
          {description}
        </span>
      </div>
    </div>
  )
}
