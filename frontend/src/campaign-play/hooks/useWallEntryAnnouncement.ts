import { useEffect, useReducer, useRef } from 'react'

import { isOwnWallEntry } from '@/campaign-play/services/ownWallEntries'
import {
  initialWallEntryAnnouncementState,
  WALL_ENTRY_ANNOUNCEMENT_WINDOW_MS,
  wallEntryAnnouncementReducer,
} from '@/campaign-play/services/wallEntryAnnouncementThrottle'
import { findNewWallEntries } from '@/campaign-play/services/wallEntryAnnouncements'
import type { WallEntry } from '@/campaign-play/types/WallEntry'

/** The text for a polite live region; the sequence changes with every announcement, even for identical text. */
export interface WallEntryAnnouncement {
  message: string
  sequence: number
}

/**
 * Announces entries that arrive after the list has been fetched since the page opened, at most once per 5 seconds
 * (specs/campaign-wall/ux.md section 4.5). The list at that first fetch is the baseline, so cached data, older pages,
 * removals, and the viewer's own post from this tab are never announced.
 */
export function useWallEntryAnnouncement(entries: WallEntry[] | undefined, isFetchedAfterMount: boolean): WallEntryAnnouncement {
  const [state, dispatch] = useReducer(wallEntryAnnouncementReducer, initialWallEntryAnnouncementState)
  const previous = useRef<readonly WallEntry[] | undefined>(undefined)

  useEffect(() => {
    if (!isFetchedAfterMount || entries === undefined) {
      return
    }

    const arrivals = findNewWallEntries(previous.current, entries).filter((entry) => !isOwnWallEntry(entry.id))
    previous.current = entries
    if (arrivals.length > 0) {
      dispatch({ type: 'batchReceived', entries: arrivals })
    }
  }, [entries, isFetchedAfterMount])

  useEffect(() => {
    if (!state.windowOpen) {
      return
    }

    const timer = setTimeout(() => dispatch({ type: 'windowElapsed' }), WALL_ENTRY_ANNOUNCEMENT_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [state.windowOpen, state.sequence])

  return { message: state.message, sequence: state.sequence }
}
