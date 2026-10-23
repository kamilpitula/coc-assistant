import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { SceneStatus } from '@/scenario-preparation/types/Scene'
import type { RichTextDocument } from '@/shared/types/RichText'

/** The Item a Scene link refers to, with its live name (Keeper-only). */
export interface ItemReference {
  id: string
  name: string
}

/**
 * A Scene's link to one Item. A link has no fields of its own: a Reveal of an Item names the Item, not a link
 * (specs/scenario-preparation/spec.md, Constraints; ADR 0022).
 */
export interface ItemLink {
  id: string
  item: ItemReference
}

/** One row of the Campaign's Item list: the name and the number of Scenes that link the Item. */
export interface ItemSummary {
  id: string
  name: string
  sceneCount: number
}

/** A Scene that links an Item, with its Scenario's title and its status; the server's positions are never sent. */
export interface ItemScene {
  scenarioId: string
  scenarioTitle: string
  id: string
  title: string
  status: SceneStatus
}

/**
 * An Item: the name Players see, the required Player-facing description, optional Keeper notes, its Handouts in stored order, and
 * the Scenes that link it in Scenario order then Scene order. `holder` is always null until PBI-SPL-003 lets an Investigator
 * hold an Item.
 */
export interface Item {
  id: string
  name: string
  playerFacingDescription: RichTextDocument
  keeperNotes: RichTextDocument | null
  holder: null
  handouts: HandoutSummary[]
  scenes: ItemScene[]
}

/** What the Keeper has entered in the Item form; the description is null while the editor is empty (specs/scenario-preparation/ux.md section 62). */
export interface ItemFormValues {
  name: string
  playerFacingDescription: RichTextDocument | null
  keeperNotes: RichTextDocument | null
}

/** A valid Item as it is sent: the trimmed name and a Player-facing description with visible text. */
export interface ItemInput {
  name: string
  playerFacingDescription: RichTextDocument
  keeperNotes: RichTextDocument | null
}

export type ItemField = 'name' | 'playerFacingDescription' | 'keeperNotes'

/** The longest Item name (specs/scenario-preparation/spec.md). */
export const ITEM_NAME_MAX_LENGTH = 200

/** Why an Item can not be deleted or lose a Handout: it is part of a Scene that has been played, or an Investigator holds it. */
export type ItemInPlayReason = 'played' | 'held'
