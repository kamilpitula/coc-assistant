import { useRef, useState } from 'react'

import { WallEntryTime } from '@/campaign-play/components/wall-entry-time/wall-entry-time'
import { RemoveWallEntryDialog } from '@/campaign-play/components/remove-wall-entry-dialog/remove-wall-entry-dialog'
import { focusTargetAfterRemoval, removeWallEntryButtonId } from '@/campaign-play/services/wallEntryFocus'
import { formatWallEntryTime } from '@/campaign-play/services/wallEntryTime'
import type { CampaignRole } from '@/campaign-play/types/Campaign'
import type { WallEntry } from '@/campaign-play/types/WallEntry'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'

interface WallEntryListProps {
  entries: WallEntry[]
  viewerRole: CampaignRole
  /** Where focus goes when the last entry is removed. */
  fallbackFocusId: string
  /** Removes the entry; resolves true once it is gone. */
  onRemove: (entryId: string) => Promise<boolean>
}

/** The Wall's entries, newest first, with the Keeper's removal (specs/campaign-wall/ux.md sections 2 and 4.3). */
export function WallEntryList({ entries, viewerRole, fallbackFocusId, onRemove }: WallEntryListProps) {
  const [removing, setRemoving] = useState<WallEntry | null>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const focusAfterClose = useRef('')

  const open = (entry: WallEntry) => {
    focusAfterClose.current = removeWallEntryButtonId(entry.id)
    setFailed(false)
    setRemoving(entry)
  }

  const confirm = async () => {
    if (!removing) {
      return
    }

    setPending(true)
    setFailed(false)
    const removed = await onRemove(removing.id)
    setPending(false)
    if (removed) {
      focusAfterClose.current = focusTargetAfterRemoval(entries, removing.id, fallbackFocusId)
      setRemoving(null)
    } else {
      setFailed(true)
    }
  }

  const focusAfterDialog = (event: Event) => {
    event.preventDefault()
    document.getElementById(focusAfterClose.current)?.focus()
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {entries.map((entry) => (
          <WallEntryItem key={entry.id} entry={entry} canRemove={viewerRole === 'Keeper'} onRemove={open} />
        ))}
      </ol>
      <RemoveWallEntryDialog
        entry={removing}
        pending={pending}
        failed={failed}
        onConfirm={() => void confirm()}
        onCancel={() => setRemoving(null)}
        onCloseAutoFocus={focusAfterDialog}
      />
    </>
  )
}

interface WallEntryItemProps {
  entry: WallEntry
  canRemove: boolean
  onRemove: (entry: WallEntry) => void
}

function WallEntryItem({ entry, canRemove, onRemove }: WallEntryItemProps) {
  const time = formatWallEntryTime(entry.createdAt, new Date())

  return (
    <li>
      <Card className="flex flex-col gap-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <WallEntryTime createdAt={entry.createdAt} />
          <span className="font-medium break-words">{entry.authorDisplayName}</span>
          {entry.visibility === 'KeeperOnly' && <Badge variant="outline">Keeper only</Badge>}
          {canRemove && (
            <Button
              id={removeWallEntryButtonId(entry.id)}
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onRemove(entry)}
            >
              Remove{' '}
              <span className="sr-only">
                Wall Entry from {entry.authorDisplayName} at {time.label ?? time.text}
              </span>
            </Button>
          )}
        </div>
        <p className="break-words whitespace-pre-line">{entry.text}</p>
      </Card>
    </li>
  )
}
