import { describeNewWallEntries } from '@/campaign-play/services/wallEntryAnnouncements'
import type { WallEntry } from '@/campaign-play/types/WallEntry'

/** How long new entries are collected after an announcement (specs/campaign-wall/ux.md section 4.5). */
export const WALL_ENTRY_ANNOUNCEMENT_WINDOW_MS = 5000

export interface AnnouncementState<T> {
  /** The text of the latest announcement; empty before the first. */
  message: string
  /** Increments with every announcement, so a repeated text is still a change. */
  sequence: number
  /** True from an announcement until a window ends with nothing held. */
  windowOpen: boolean
  /** Items received during the open window, waiting for it to end. */
  held: readonly T[]
}

export type AnnouncementAction<T> = { type: 'batchReceived'; entries: readonly T[] } | { type: 'windowElapsed' }

/**
 * Announces new items at most once per window: the first batch at once, then everything received during the window
 * as one merged message when it ends, which starts the next window. The Wall and the Player's Requested Rolls share
 * it with their own describe function (PBI-DICE-005, announcement merging).
 */
export function createAnnouncementReducer<T>(describe: (entries: readonly T[]) => string) {
  return function announcementReducer(state: AnnouncementState<T>, action: AnnouncementAction<T>): AnnouncementState<T> {
    if (action.type === 'batchReceived') {
      if (state.windowOpen) {
        return { ...state, held: [...state.held, ...action.entries] }
      }

      return { message: describe(action.entries), sequence: state.sequence + 1, windowOpen: true, held: [] }
    }

    if (state.held.length > 0) {
      return { message: describe(state.held), sequence: state.sequence + 1, windowOpen: true, held: [] }
    }

    return { ...state, windowOpen: false }
  }
}

export type WallEntryAnnouncementState = AnnouncementState<WallEntry>

export type WallEntryAnnouncementAction = AnnouncementAction<WallEntry>

export const initialWallEntryAnnouncementState: WallEntryAnnouncementState = {
  message: '',
  sequence: 0,
  windowOpen: false,
  held: [],
}

/** Announces new entries at most once per window (specs/campaign-wall/ux.md section 4.5). */
export const wallEntryAnnouncementReducer = createAnnouncementReducer(describeNewWallEntries)
