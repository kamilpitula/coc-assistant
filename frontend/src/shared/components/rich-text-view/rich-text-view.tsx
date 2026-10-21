import { addClassNamesToElement } from '@lexical/utils'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, type HeadingTagType } from '@lexical/rich-text'
import type { EditorConfig, Klass, LexicalNode, LexicalNodeReplacement } from 'lexical'
import { useState } from 'react'

import { RICH_TEXT_NODES, RICH_TEXT_THEME } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

const OFFSET_TAGS: Record<string, HeadingTagType> = { h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6' }

/** Renders a heading one level lower, only in the read-only view; the stored document keeps its level (ADR 0015). */
class OffsetHeadingNode extends HeadingNode {
  $config() {
    return this.config('offset-heading', { extends: HeadingNode })
  }

  createDOM(config: EditorConfig): HTMLElement {
    const tag = OFFSET_TAGS[this.__tag] ?? this.__tag
    const element = globalThis.document.createElement(tag)
    const className = config.theme.heading?.[tag]
    if (className !== undefined) {
      addClassNamesToElement(element, className)
    }
    return element
  }
}

const OFFSET_THEME = {
  ...RICH_TEXT_THEME,
  heading: {
    h4: RICH_TEXT_THEME.heading?.h3,
    h5: RICH_TEXT_THEME.heading?.h4,
  },
}

// The replacement class must be registered as well as the node it replaces.
const OFFSET_NODES: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement> = [
  ...RICH_TEXT_NODES,
  OffsetHeadingNode,
  {
    replace: HeadingNode,
    with: (node: HeadingNode) => new OffsetHeadingNode(node.getTag()),
    withKlass: OffsetHeadingNode,
  },
]

interface RichTextViewProps {
  document: RichTextDocument
  /** Shifts every heading down this many levels (default 0). A section under an h2 and an h3 passes 1: Heading is h4. */
  headingOffset?: 0 | 1
}

/**
 * Renders a rich-text document read-only with the same nodes and theme as the editor (specs/scenario-preparation/ux.md
 * section 15). Nothing outside the allowed nodes can render, because only those nodes are registered.
 */
export function RichTextView({ document, headingOffset = 0 }: RichTextViewProps) {
  const [initialConfig] = useState(() => ({
    namespace: 'rich-text-view',
    nodes: headingOffset === 1 ? [...OFFSET_NODES] : [...RICH_TEXT_NODES],
    theme: headingOffset === 1 ? OFFSET_THEME : RICH_TEXT_THEME,
    editable: false,
    editorState: JSON.stringify(document),
    onError: (error: Error) => {
      throw error
    },
  }))

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable role="presentation" className="max-w-full text-sm break-words outline-none" />}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  )
}
