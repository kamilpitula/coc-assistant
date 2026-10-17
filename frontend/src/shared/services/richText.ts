import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import type { EditorThemeClasses, Klass, LexicalNode } from 'lexical'

import type { RichTextDocument } from '@/shared/types/RichText'

/** 200 KB as 204,800 bytes of UTF-8 in the JSON text sent (ADR 0015 amendment). */
export const RICH_TEXT_MAX_BYTES = 204_800

/** The two heading levels the editor offers and the server accepts: Heading and Subheading. */
export const RICH_TEXT_HEADING_TAGS = ['h3', 'h4'] as const

/** Lexical's text format bits that are allowed: bold, italic, strikethrough, underline. The rest are cleared. */
export const RICH_TEXT_ALLOWED_FORMAT_BITS = 1 | 2 | 4 | 8

export const RICH_TEXT_LINK_TARGET = '_blank'
export const RICH_TEXT_LINK_REL = 'noopener noreferrer'

/**
 * The allowed node types of a document as they appear in the JSON (ADR 0015 amendment). The backend rules in
 * CocAssistant.ScenarioPreparation.Domain list the same types; specs/scenario-preparation/rich-text-fixtures.json is
 * the shared definition both test suites must satisfy. Paragraph, text, line break, and root are Lexical core nodes.
 */
export const RICH_TEXT_NODE_TYPES = [
  'root',
  'paragraph',
  'heading',
  'quote',
  'list',
  'listitem',
  'link',
  'text',
  'linebreak',
] as const

/** The Lexical node classes the editor and the view both register, in addition to the core nodes. */
export const RICH_TEXT_NODES: ReadonlyArray<Klass<LexicalNode>> = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode]

/** Tailwind classes for the editor and the view, so what the Keeper edits is what the Keeper reads. */
export const RICH_TEXT_THEME: EditorThemeClasses = {
  paragraph: 'my-2 first:mt-0 last:mb-0',
  quote: 'my-2 border-l-4 pl-3 italic text-muted-foreground',
  heading: {
    h3: 'mt-4 mb-2 text-lg font-semibold first:mt-0',
    h4: 'mt-3 mb-1 text-base font-semibold first:mt-0',
  },
  list: {
    ul: 'my-2 list-disc pl-6',
    ol: 'my-2 list-decimal pl-6',
    listitem: 'my-0.5',
    nested: { listitem: 'list-none' },
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
  link: 'text-primary underline underline-offset-2',
}

/** True for an absolute web address that starts with http:// or https:// and names a host. */
export function isAllowedLinkUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) {
    return false
  }
  try {
    return new URL(url).hostname.length > 0
  } catch {
    return false
  }
}

function hasContent(node: unknown): boolean {
  if (typeof node !== 'object' || node === null) {
    return false
  }
  const { text, children } = node as { text?: unknown; children?: unknown }
  if (typeof text === 'string' && text.trim() !== '') {
    return true
  }
  return Array.isArray(children) && children.some(hasContent)
}

/** True for no document and for a document without any visible text, such as the editor's empty paragraph. */
export function isEmptyRichText(document: RichTextDocument | null | undefined): boolean {
  return !document || !hasContent(document.root)
}

/** The size the server measures: the UTF-8 bytes of the JSON text that is sent. */
export function richTextByteLength(document: RichTextDocument): number {
  return new TextEncoder().encode(JSON.stringify(document)).length
}
