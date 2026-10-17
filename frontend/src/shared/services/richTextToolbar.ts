import { $createLinkNode, $isLinkNode, $toggleLink } from '@lexical/link'
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { $findMatchingParent, $getNearestNodeOfType } from '@lexical/utils'
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
  type TextFormatType,
} from 'lexical'

import { RICH_TEXT_LINK_REL, RICH_TEXT_LINK_TARGET } from '@/shared/services/richText'

/** What a formatting button does (specs/scenario-preparation/ux.md section 15). */
export type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'heading'
  | 'subheading'
  | 'quote'
  | 'bulleted-list'
  | 'numbered-list'

/** Which buttons are pressed for the current selection. */
export type ToolbarState = Record<ToolbarAction | 'link', boolean>

export const EMPTY_TOOLBAR_STATE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  heading: false,
  subheading: false,
  quote: false,
  'bulleted-list': false,
  'numbered-list': false,
  link: false,
}

const TEXT_FORMATS: Record<'bold' | 'italic' | 'underline' | 'strikethrough', TextFormatType> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikethrough',
}

function linkAt(selection: RangeSelection) {
  const fromAnchor = $findMatchingParent(selection.anchor.getNode(), $isLinkNode)
  return fromAnchor ?? $findMatchingParent(selection.focus.getNode(), $isLinkNode)
}

function blockState(node: LexicalNode): Partial<ToolbarState> {
  const list = $getNearestNodeOfType(node, ListNode)
  if (list && $isListNode(list)) {
    return list.getListType() === 'number' ? { 'numbered-list': true } : { 'bulleted-list': true }
  }
  const block = node.getTopLevelElement()
  if ($isHeadingNode(block)) {
    return block.getTag() === 'h3' ? { heading: true } : { subheading: true }
  }
  return $isQuoteNode(block) ? { quote: true } : {}
}

/** Reads the pressed states from the selection. Call inside editorState.read or an update. */
export function $readToolbarState(): ToolbarState {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) {
    return EMPTY_TOOLBAR_STATE
  }

  return {
    ...EMPTY_TOOLBAR_STATE,
    bold: selection.hasFormat('bold'),
    italic: selection.hasFormat('italic'),
    underline: selection.hasFormat('underline'),
    strikethrough: selection.hasFormat('strikethrough'),
    link: linkAt(selection) !== null,
    ...blockState(selection.anchor.getNode()),
  }
}

/** The web address of the link at the selection, or null when the selection is not in a link. */
export function $readSelectedLinkUrl(): string | null {
  const selection = $getSelection()
  return $isRangeSelection(selection) ? (linkAt(selection)?.getURL() ?? null) : null
}

function setBlock(editor: LexicalEditor, create: () => LexicalNode, active: boolean, inList: boolean) {
  if (inList) {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
  }
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => (active ? $createParagraphNode() : create()) as ReturnType<typeof $createParagraphNode>)
    }
  })
}

function toggleList(editor: LexicalEditor, action: 'bulleted-list' | 'numbered-list', state: ToolbarState) {
  if (state[action]) {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
    return
  }
  editor.dispatchCommand(action === 'bulleted-list' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND, undefined)
}

/**
 * Applies a button to the selection. An active block button returns the block to a paragraph; a heading or quote
 * chosen inside a list first leaves the list, because a list item cannot hold a heading or quote.
 */
export function applyToolbarAction(editor: LexicalEditor, action: ToolbarAction, state: ToolbarState): void {
  const inList = state['bulleted-list'] || state['numbered-list']
  switch (action) {
    case 'bold':
    case 'italic':
    case 'underline':
    case 'strikethrough':
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, TEXT_FORMATS[action])
      break
    case 'heading':
      setBlock(editor, () => $createHeadingNode('h3'), state.heading, inList)
      break
    case 'subheading':
      setBlock(editor, () => $createHeadingNode('h4'), state.subheading, inList)
      break
    case 'quote':
      setBlock(editor, () => $createQuoteNode(), state.quote, inList)
      break
    default:
      toggleList(editor, action, state)
  }
}

/** Adds or changes the link at the selection, or removes it when `url` is null. Always opens in a new tab, safely. */
export function applyLink(editor: LexicalEditor, url: string | null): void {
  editor.update(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) {
      return
    }
    const attributes = { target: RICH_TEXT_LINK_TARGET, rel: RICH_TEXT_LINK_REL }
    if (url !== null && selection.isCollapsed() && linkAt(selection) === null) {
      const link = $createLinkNode(url, attributes)
      link.append($createTextNode(url))
      selection.insertNodes([link])
      return
    }
    $toggleLink(url, attributes)
  })
}
