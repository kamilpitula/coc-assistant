import type { RichTextDocument } from '@/shared/types/RichText'

export type SceneStatus = 'Prepared' | 'Active' | 'Finished'

/** A Scene as listed on its Scenario. The server's position is never sent; list order is the prepared order. */
export interface SceneSummary {
  id: string
  title: string
  status: SceneStatus
  /** ISO 8601, set once the Scene is Active. */
  startedAt: string | null
  /** ISO 8601, set once the Scene is Finished. */
  finishedAt: string | null
}

/** A Scene with its location ("" when empty) and rich-text Keeper notes (null when none). */
export interface Scene extends SceneSummary {
  location: string
  keeperNotes: RichTextDocument | null
}

/** What the Keeper enters for a Scene (specs/scenario-preparation/ux.md sections 13 and 14). */
export interface SceneInput {
  title: string
  location: string
  keeperNotes: RichTextDocument | null
}

/** The longest Scene title and location (specs/scenario-preparation/spec.md). */
export const SCENE_TITLE_MAX_LENGTH = 200
export const SCENE_LOCATION_MAX_LENGTH = 200

export type SceneField = 'title' | 'location' | 'keeperNotes'
