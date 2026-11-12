import { useEffect, useMemo, useReducer, useRef } from 'react'

import {
  createAnnouncementReducer,
  WALL_ENTRY_ANNOUNCEMENT_WINDOW_MS,
  type AnnouncementState,
} from '@/campaign-play/services/wallEntryAnnouncementThrottle'
import { describeNewRequestedRolls, findNewRequestedRolls } from '@/roll-requests/services/requestedRollAnnouncements'
import type { WaitingRequestedRoll } from '@/roll-requests/types/RollRequest'

/** The text for the assertive live region; the sequence changes with every announcement, even for identical text. */
export interface RequestedRollAnnouncement {
  message: string
  sequence: number
}

const initialRequestedRollAnnouncementState: AnnouncementState<WaitingRequestedRoll> = {
  message: '',
  sequence: 0,
  windowOpen: false,
  held: [],
}

/**
 * Announces Requested Rolls that arrive after the waiting list has been fetched since the page opened, at most once
 * per 5 seconds (specs/roll-requests/ux.md section 8). The list at that first fetch is the baseline, so cached data,
 * the fetch itself, and rolls leaving the list are never announced. Results are never announced.
 */
export function useRequestedRollAnnouncement(
  rolls: readonly WaitingRequestedRoll[] | undefined,
  isFetchedAfterMount: boolean,
  investigatorName: string | null,
  onActiveScenePage: boolean,
): RequestedRollAnnouncement {
  const reducer = useMemo(
    () =>
      createAnnouncementReducer<WaitingRequestedRoll>((arrivals) =>
        describeNewRequestedRolls(arrivals, investigatorName ?? 'your Investigator', onActiveScenePage),
      ),
    [investigatorName, onActiveScenePage],
  )
  const [state, dispatch] = useReducer(reducer, initialRequestedRollAnnouncementState)
  const previous = useRef<readonly WaitingRequestedRoll[] | undefined>(undefined)

  useEffect(() => {
    if (!isFetchedAfterMount || rolls === undefined) {
      return
    }

    const arrivals = findNewRequestedRolls(previous.current, rolls)
    previous.current = rolls
    if (arrivals.length > 0) {
      dispatch({ type: 'batchReceived', entries: arrivals })
    }
  }, [rolls, isFetchedAfterMount])

  useEffect(() => {
    if (!state.windowOpen) {
      return
    }

    const timer = setTimeout(() => dispatch({ type: 'windowElapsed' }), WALL_ENTRY_ANNOUNCEMENT_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [state.windowOpen, state.sequence])

  return { message: state.message, sequence: state.sequence }
}
