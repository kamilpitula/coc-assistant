import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { useState } from 'react'

import { RICH_TEXT_NODES, RICH_TEXT_THEME } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

interface RichTextViewProps {
  document: RichTextDocument
}

/**
 * Renders a rich-text document read-only with the same nodes and theme as the editor (specs/scenario-preparation/ux.md
 * section 15). Nothing outside the allowed nodes can render, because only those nodes are registered.
 */
export function RichTextView({ document }: RichTextViewProps) {
  const [initialConfig] = useState(() => ({
    namespace: 'rich-text-view',
    nodes: [...RICH_TEXT_NODES],
    theme: RICH_TEXT_THEME,
    editable: false,
    editorState: JSON.stringify(document),
    onError: (error: Error) => {
      throw error
    },
  }))

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable aria-readonly={true} className="max-w-full text-sm break-words outline-none" />}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  )
}
