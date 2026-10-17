import { $unwrapNode } from '@lexical/utils'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode } from '@lexical/rich-text'
import { $createTextNode, mergeRegister, TabNode, TextNode, type LexicalEditor } from 'lexical'

import {
  isAllowedLinkUrl,
  RICH_TEXT_ALLOWED_FORMAT_BITS,
  RICH_TEXT_LINK_REL,
  RICH_TEXT_LINK_TARGET,
} from '@/shared/services/richText'

const TAB_AS_SPACES = '    '

/** Pasted headings map to the two levels the document allows: h1 and h2 to h3, h5 and h6 to h4. */
function normalizeHeading(node: HeadingNode): void {
  const tag = node.getTag()
  if (tag === 'h1' || tag === 'h2') {
    node.setTag('h3')
  } else if (tag === 'h5' || tag === 'h6') {
    node.setTag('h4')
  }
}

/** Clears every format bit and every inline style that the document does not allow. */
function normalizeText(node: TextNode): void {
  const format = node.getFormat()
  if ((format & ~RICH_TEXT_ALLOWED_FORMAT_BITS) !== 0) {
    node.setFormat(format & RICH_TEXT_ALLOWED_FORMAT_BITS)
  }
  if (node.getStyle() !== '') {
    node.setStyle('')
  }
}

/** A link keeps its text but loses a scheme other than http and https; the rest open in a new tab, safely. */
function normalizeLink(node: LinkNode): void {
  if (!isAllowedLinkUrl(node.getURL())) {
    $unwrapNode(node)
    return
  }
  if (node.getTarget() !== RICH_TEXT_LINK_TARGET) {
    node.setTarget(RICH_TEXT_LINK_TARGET)
  }
  if (node.getRel() !== RICH_TEXT_LINK_REL) {
    node.setRel(RICH_TEXT_LINK_REL)
  }
}

function normalizeList(node: ListNode): void {
  if (node.getListType() === 'check') {
    node.setListType('bullet')
  }
}

function normalizeListItem(node: ListItemNode): void {
  if (node.getChecked() !== undefined) {
    node.setChecked(undefined)
  }
}

function replaceTabWithSpaces(node: TabNode): void {
  node.replace($createTextNode(TAB_AS_SPACES).setFormat(node.getFormat() & RICH_TEXT_ALLOWED_FORMAT_BITS))
}

/**
 * Registers the transforms that keep whatever the Keeper types or pastes inside the allowed nodes (ADR 0015
 * amendment), so the server's refusals are reached only by clients other than the editor. Returns the unregister function.
 */
export function registerRichTextNormalization(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerNodeTransform(HeadingNode, normalizeHeading),
    editor.registerNodeTransform(TextNode, normalizeText),
    editor.registerNodeTransform(TabNode, replaceTabWithSpaces),
    editor.registerNodeTransform(LinkNode, normalizeLink),
    editor.registerNodeTransform(ListNode, normalizeList),
    editor.registerNodeTransform(ListItemNode, normalizeListItem),
  )
}
