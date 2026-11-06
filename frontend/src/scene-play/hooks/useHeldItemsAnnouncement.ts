import { useEffect, useRef, useState } from 'react'

import type { RevealAnnouncement } from '@/scene-play/hooks/useReveals'
import { newHeldItemsAnnouncement } from '@/scene-play/services/revealPresentation'

/**
 * Announces the held Items that arrive in a refetch after the first load (specs/scene-play/ux.md section 22.7): a gain
 * names the Item, a loss names the taken-back Item, and several changes are counted. The first fetched list is the
 * baseline, so the first load and an unchanged refetch announce nothing. `items` is undefined until a list is known.
 */
export function useHeldItemsAnnouncement(
  items: ReadonlyArray<{ revealId: string; name: string }> | undefined,
  investigatorName: string | null,
  isFetchedAfterMount: boolean,
): RevealAnnouncement {
  const [announcement, setAnnouncement] = useState<RevealAnnouncement>({ message: '', sequence: 0 })
  const knownItems = useRef<ReadonlyMap<string, string> | null>(null)

  useEffect(() => {
    if (!isFetchedAfterMount || items === undefined) {
      return
    }

    const message = knownItems.current === null ? null : newHeldItemsAnnouncement(knownItems.current, items, investigatorName)
    knownItems.current = new Map(items.map((item) => [item.revealId, item.name]))
    if (message) {
      setAnnouncement((current) => ({ message, sequence: current.sequence + 1 }))
    }
  }, [items, investigatorName, isFetchedAfterMount])

  return announcement
}
