import { describeNewWallEntries } from '@/campaign-play/services/wallEntryAnnouncements'
import type { WallEntry } from '@/campaign-play/types/WallEntry'

/** How long new entries are collected after an announcement (specs/campaign-wall/ux.md section 4.5). */
export const WALL_ENTRY_ANNOUNCEMENT_WINDOW_MS = 5000

export interface WallEntryAnnouncementState {
  /** The text of the latest announcement; empty before the first. */
  message: string
  /** Increments with every announcement, so a repeated text is still a change. */
  sequence: number
  /** True from an announcement until a window ends with nothing held. */
  windowOpen: boolean
  /** Entries received during the open window, waiting for it to end. */
  held: readonly WallEntry[]
}

export type WallEntryAnnouncementAction =
  | { type: 'batchReceived'; entries: readonly WallEntry[] }
  | { type: 'windowElapsed' }

export const initialWallEntryAnnouncementState: WallEntryAnnouncementState = {
  message: '',
  sequence: 0,
  windowOpen: false,
  held: [],
}

function announce(state: WallEntryAnnouncementState, entries: readonly WallEntry[]): WallEntryAnnouncementState {
  return { message: describeNewWallEntries(entries), sequence: state.sequence + 1, windowOpen: true, held: [] }
}

/**
 * Announces new entries at most once per window: the first batch at once, then everything received during the window
 * as one merged message when it ends, which starts the next window.
 */
export function wallEntryAnnouncementReducer(
  state: WallEntryAnnouncementState,
  action: WallEntryAnnouncementAction,
): WallEntryAnnouncementState {
  if (action.type === 'batchReceived') {
    return state.windowOpen ? { ...state, held: [...state.held, ...action.entries] } : announce(state, action.entries)
  }

  return state.held.length > 0 ? announce(state, state.held) : { ...state, windowOpen: false }
}
