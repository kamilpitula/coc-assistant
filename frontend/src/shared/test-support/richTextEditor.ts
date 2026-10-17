import { registerList } from '@lexical/list'
import { registerRichText } from '@lexical/rich-text'
import { createEditor, type LexicalEditor } from 'lexical'

import { RICH_TEXT_NODES, RICH_TEXT_THEME } from '@/shared/services/richText'
import { registerRichTextNormalization } from '@/shared/services/richTextNormalization'
import type { RichTextDocument } from '@/shared/types/RichText'

/** A headless editor with the shared nodes and command handlers and the normalization transforms, for service tests. */
export function createTestEditor(): LexicalEditor {
  const editor = createEditor({
    namespace: 'rich-text-test',
    nodes: [...RICH_TEXT_NODES],
    theme: RICH_TEXT_THEME,
    onError: (error) => {
      throw error
    },
  })
  registerRichText(editor)
  registerList(editor)
  registerRichTextNormalization(editor)
  return editor
}

/** Loads a document into the editor and applies the update synchronously. */
export function loadDocument(editor: LexicalEditor, document: unknown): void {
  editor.setEditorState(editor.parseEditorState(JSON.stringify(document)), { tag: 'history-merge' })
  editor.update(() => undefined, { discrete: true })
}

/** The editor's current state serialized the way the form sends it. */
export function serialize(editor: LexicalEditor): RichTextDocument {
  return JSON.parse(JSON.stringify(editor.getEditorState().toJSON())) as RichTextDocument
}
