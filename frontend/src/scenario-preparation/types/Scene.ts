import type { NonPlayerEntitySummary, NonPlayerEntityType } from '@/scenario-preparation/types/NonPlayerEntity'
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

/**
 * A Scene's link to one Human NPC or Mythos Creature: a reference with the live profile name (Keeper-only) beside the
 * Player-facing name and rich-text description, the only parts a Player ever receives (specs/scenario-preparation/spec.md).
 */
export interface NonPlayerEntityLink {
  id: string
  nonPlayerEntity: NonPlayerEntitySummary
  playerFacingName: string
  playerFacingDescription: RichTextDocument | null
}

/** A Scene with its location ("" when empty), rich-text Keeper notes (null when none), and its links in the order linked. */
export interface Scene extends SceneSummary {
  location: string
  keeperNotes: RichTextDocument | null
  nonPlayerEntityLinks: NonPlayerEntityLink[]
}

/** What the Keeper enters for a link (specs/scenario-preparation/ux.md section 33); the entity is chosen once, when linking. */
export interface NonPlayerEntityLinkInput {
  playerFacingName: string
  playerFacingDescription: RichTextDocument | null
}

/** The entity chosen in the picker: its wire type and id. */
export interface NonPlayerEntityReference {
  type: NonPlayerEntityType
  id: string
}

export interface NewNonPlayerEntityLinkInput extends NonPlayerEntityLinkInput {
  nonPlayerEntity: NonPlayerEntityReference
}

/** The longest Player-facing name (specs/scenario-preparation/spec.md). */
export const PLAYER_FACING_NAME_MAX_LENGTH = 200

export type NonPlayerEntityLinkField = 'nonPlayerEntity' | 'playerFacingName' | 'playerFacingDescription'

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
