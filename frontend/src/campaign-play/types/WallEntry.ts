/** Who may read a Wall Entry; Keeper-only entries never reach a Player (specs/campaign-play/spec.md). */
export const WALL_ENTRY_VISIBILITIES = ['Public', 'KeeperOnly'] as const

export type WallEntryVisibility = (typeof WALL_ENTRY_VISIBILITIES)[number]

/** The longest Wall Entry text (specs/campaign-wall/ux.md section 2). */
export const WALL_ENTRY_TEXT_MAX_LENGTH = 2000

/** A Wall Entry as the server projects it for the caller: the author is a display name, never an Account id. */
export interface WallEntry {
  id: string
  text: string
  visibility: WallEntryVisibility
  createdAt: string
  authorDisplayName: string
}

/** One page of the Wall, newest first; the cursor is set only when older entries visible to the caller exist. */
export interface WallEntryPage {
  entries: WallEntry[]
  nextCursor: string | null
}

export interface NewWallEntry {
  text: string
  /** Omitted for a Player, who can only add Public entries. */
  visibility?: WallEntryVisibility
}
