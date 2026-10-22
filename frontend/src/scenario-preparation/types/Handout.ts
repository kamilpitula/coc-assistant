import type { HandoutFileFamily } from '@/scenario-preparation/services/handoutFile'
import type { RichTextDocument } from '@/shared/types/RichText'

/** The kinds of Handout: rich text (Read-aloud, Text) and stored files (Image, Document, Map) (CONTEXT.md, Handout). */
export type HandoutKind = 'ReadAloud' | 'Text' | 'Image' | 'Document' | 'Map'

export type RichTextHandoutKind = 'ReadAloud' | 'Text'

export type FileHandoutKind = 'Image' | 'Document' | 'Map'

/** Whether a Handout may reach Players through a Reveal; always chosen explicitly. */
export type HandoutVisibility = 'PlayerFacing' | 'KeeperFacing'

/** The visible names of the kinds (specs/scenario-preparation/ux.md sections 45 and 55). */
export const HANDOUT_KIND_LABELS: Record<HandoutKind, string> = {
  ReadAloud: 'Read-aloud',
  Text: 'Text',
  Image: 'Image',
  Document: 'Document',
  Map: 'Map',
}

/** What a kind holds; a kind can change only within its family (spec.md, Handout API). */
export type HandoutKindFamily = 'richText' | HandoutFileFamily

export const HANDOUT_KIND_FAMILIES: Record<HandoutKind, HandoutKindFamily> = {
  ReadAloud: 'richText',
  Text: 'richText',
  Image: 'picture',
  Map: 'picture',
  Document: 'document',
}

/** The visible names of the visibilities. */
export const HANDOUT_VISIBILITY_LABELS: Record<HandoutVisibility, string> = {
  PlayerFacing: 'Player-facing',
  KeeperFacing: 'Keeper-facing',
}

/** A Handout as listed on its Scene: no content, no file, and no position (list order is the stored order). */
export interface HandoutSummary {
  id: string
  kind: HandoutKind
  visibility: HandoutVisibility
  title: string
}

/** The details of a stored file; the bytes come from the file endpoint. */
export interface HandoutFileDetails {
  name: string
  mediaType: string
  sizeBytes: number
}

/** A Read-aloud or Text Handout with its rich-text content. */
export interface RichTextHandout extends HandoutSummary {
  kind: RichTextHandoutKind
  content: RichTextDocument
}

/** An Image, Document, or Map Handout with its file's details. */
export interface FileHandout extends HandoutSummary {
  kind: FileHandoutKind
  file: HandoutFileDetails
}

/** A Handout with its content or its file; exactly one is present. */
export type Handout = RichTextHandout | FileHandout

export const isFileHandout = (handout: Handout): handout is FileHandout => HANDOUT_KIND_FAMILIES[handout.kind] !== 'richText'

/** What the Keeper enters for a rich-text Handout (specs/scenario-preparation/ux.md section 43). */
export interface RichTextHandoutInput {
  kind: RichTextHandoutKind
  visibility: HandoutVisibility
  title: string
  content: RichTextDocument
}

/** What the Keeper enters for a file Handout; a null file on an edit keeps the stored one (section 51). */
export interface FileHandoutInput {
  kind: FileHandoutKind
  visibility: HandoutVisibility
  title: string
  file: File | null
}

export type HandoutInput = RichTextHandoutInput | FileHandoutInput

export const isFileInput = (input: HandoutInput): input is FileHandoutInput => 'file' in input

/** The longest Handout title (specs/scenario-preparation/spec.md). */
export const HANDOUT_TITLE_MAX_LENGTH = 200

export type HandoutField = 'title' | 'kind' | 'visibility' | 'content' | 'file'
