import { addClassNamesToElement } from '@lexical/utils'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HeadingNode, type HeadingTagType } from '@lexical/rich-text'
import type { EditorConfig, EditorThemeClasses, Klass, LexicalNode, LexicalNodeReplacement } from 'lexical'
import { useContext, useState } from 'react'

import { HeadingOffsetContext } from '@/shared/providers/heading-offset/heading-offset-context'
import { RICH_TEXT_NODES, RICH_TEXT_THEME } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

/** The largest combined offset: the stored h3 and h4 still render, clamped at h6. */
const MAX_OFFSET = 3

function shiftHeadingTag(tag: HeadingTagType, offset: number): HeadingTagType {
  const level = Math.min(6, Math.max(1, Number(tag.slice(1)) + offset))
  return `h${level}` as HeadingTagType
}

/** The stored h3 and h4 render shifted but keep their own visual style (so an offset view reads the same, lower). */
function offsetTheme(offset: number): EditorThemeClasses {
  return {
    ...RICH_TEXT_THEME,
    heading: {
      [shiftHeadingTag('h3', offset)]: RICH_TEXT_THEME.heading?.h3,
      [shiftHeadingTag('h4', offset)]: RICH_TEXT_THEME.heading?.h4,
    },
  }
}

function offsetNodes(offset: number): ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement> {
  /** Renders a heading lower, only in the read-only view; the stored document keeps its level (ADR 0015). */
  class OffsetHeadingNode extends HeadingNode {
    $config() {
      return this.config(`offset-heading-${offset}`, { extends: HeadingNode })
    }

    createDOM(config: EditorConfig): HTMLElement {
      const tag = shiftHeadingTag(this.__tag, offset)
      const element = globalThis.document.createElement(tag)
      const className = config.theme.heading?.[tag]
      if (className !== undefined) {
        addClassNamesToElement(element, className)
      }
      return element
    }
  }

  return [
    ...RICH_TEXT_NODES,
    OffsetHeadingNode,
    {
      replace: HeadingNode,
      with: (node: HeadingNode) => new OffsetHeadingNode(node.getTag()),
      withKlass: OffsetHeadingNode,
    },
  ]
}

interface RichTextViewProps {
  document: RichTextDocument
  /** Shifts every heading down this many levels (default 0). A section under an h2 and an h3 passes 1: Heading is h4. */
  headingOffset?: 0 | 1 | 2 | 3
}

/**
 * Renders a rich-text document read-only with the same nodes and theme as the editor (specs/scenario-preparation/ux.md
 * section 15). Nothing outside the allowed nodes can render, because only those nodes are registered. The effective
 * offset adds the enclosing `HeadingOffsetProvider` offset to the prop, clamped to 3.
 */
export function RichTextView({ document, headingOffset = 0 }: RichTextViewProps) {
  const contextOffset = useContext(HeadingOffsetContext)
  const [initialConfig] = useState(() => {
    const effectiveOffset = Math.min(MAX_OFFSET, Math.max(0, headingOffset + contextOffset))
    return {
      namespace: 'rich-text-view',
      nodes: effectiveOffset === 0 ? [...RICH_TEXT_NODES] : offsetNodes(effectiveOffset),
      theme: effectiveOffset === 0 ? RICH_TEXT_THEME : offsetTheme(effectiveOffset),
      editable: false,
      editorState: JSON.stringify(document),
      onError: (error: Error) => {
        throw error
      },
    }
  })

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable role="presentation" className="max-w-full text-sm break-words outline-none" />}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  )
}
