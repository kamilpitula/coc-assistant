import type { RichTextDocument } from '@/shared/types/RichText'

/** The rich-text kinds of Handout; file kinds arrive with PBI-SP-007 (CONTEXT.md, Handout). */
export type HandoutKind = 'ReadAloud' | 'Text'

/** Whether a Handout may reach Players through a Reveal; always chosen explicitly. */
export type HandoutVisibility = 'PlayerFacing' | 'KeeperFacing'

/** The visible names of the kinds (specs/scenario-preparation/ux.md section 45). */
export const HANDOUT_KIND_LABELS: Record<HandoutKind, string> = {
  ReadAloud: 'Read-aloud',
  Text: 'Text',
}

/** The visible names of the visibilities. */
export const HANDOUT_VISIBILITY_LABELS: Record<HandoutVisibility, string> = {
  PlayerFacing: 'Player-facing',
  KeeperFacing: 'Keeper-facing',
}

/** A Handout as listed on its Scene: no content, and no position (list order is the stored order). */
export interface HandoutSummary {
  id: string
  kind: HandoutKind
  visibility: HandoutVisibility
  title: string
}

/** A Handout with its rich-text content. */
export interface Handout extends HandoutSummary {
  content: RichTextDocument
}

/** What the Keeper enters for a Handout (specs/scenario-preparation/ux.md section 43). */
export interface HandoutInput {
  kind: HandoutKind
  visibility: HandoutVisibility
  title: string
  content: RichTextDocument
}

/** The longest Handout title (specs/scenario-preparation/spec.md). */
export const HANDOUT_TITLE_MAX_LENGTH = 200

export type HandoutField = 'title' | 'kind' | 'visibility' | 'content'
