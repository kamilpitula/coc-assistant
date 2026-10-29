import type { HandoutKind } from '@/scenario-preparation/types/Handout'
import type { RichTextDocument } from '@/shared/types/RichText'

/** What a Reveal shows. An Item cannot be revealed until PBI-SPL-003. */
export type RevealSubjectType = 'Handout' | 'NonPlayerEntity'

/** The details of a revealed file; the bytes come from the Reveal's file endpoint. */
export interface RevealFileDetails {
  name: string
  mediaType: string
  sizeBytes: number
}

/**
 * A Reveal as a Player sees it (specs/scene-play/spec.md, API Contracts): the snapshot only. It carries no subject id and no
 * recipients, so a Player never learns who else received it.
 */
export interface PlayerReveal {
  revealId: string
  /** ISO 8601. */
  revealedAt: string
  subjectType: RevealSubjectType
  title: string
  /** Null for a Non-Player Entity. */
  handoutKind: HandoutKind | null
  /** The rich text of a Read-aloud or Text Handout, or a Non-Player Entity's Player-facing description; otherwise null. */
  content: RichTextDocument | null
  file: RevealFileDetails | null
  imageDescription: string | null
}

/** An Investigator a Reveal reached, as the Keeper sees it. The name may be missing. */
export interface RevealRecipient {
  id: string
  name: string | null
}

/** A Reveal as the Keeper sees it: the Player view plus the subject id and the recipients. */
export interface KeeperReveal extends PlayerReveal {
  subjectId: string
  recipients: RevealRecipient[]
}

/** A Reveal that reached an Investigator, with the Scene it was made on (CONTEXT.md, Clue). */
export interface Clue extends PlayerReveal {
  scene: { id: string; title: string }
}

/** An Investigator's Clues, newest first. */
export interface Clues {
  investigatorName: string | null
  clues: Clue[]
}

/** What the Keeper submits in the reveal dialog; the client always names the Investigators. */
export interface RevealInput {
  subjectType: RevealSubjectType
  subjectId: string
  investigatorIds: string[]
}
