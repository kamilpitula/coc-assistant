import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { useEffect, useState } from 'react'

import { RichTextLinkDialog } from '@/shared/components/rich-text-link-dialog/rich-text-link-dialog'
import { RichTextToolbar, type ToolbarButton } from '@/shared/components/rich-text-toolbar/rich-text-toolbar'
import {
  isAllowedLinkUrl,
  isEmptyRichText,
  RICH_TEXT_LINK_REL,
  RICH_TEXT_LINK_TARGET,
  RICH_TEXT_NODES,
  RICH_TEXT_THEME,
} from '@/shared/services/richText'
import { registerRichTextNormalization } from '@/shared/services/richTextNormalization'
import {
  $readSelectedLinkUrl,
  $readToolbarState,
  applyLink,
  applyToolbarAction,
  EMPTY_TOOLBAR_STATE,
  type ToolbarState,
} from '@/shared/services/richTextToolbar'
import type { RichTextDocument } from '@/shared/types/RichText'

const LINK_ATTRIBUTES = { target: RICH_TEXT_LINK_TARGET, rel: RICH_TEXT_LINK_REL }

interface RichTextEditorProps {
  /** The id of the editable area, for the label's `htmlFor`-like wiring and tests. */
  id: string
  /** The id of the visible label that names the editable area. */
  labelledBy: string
  /** The ids of the hint and any error, in reading order. */
  describedBy?: string
  invalid?: boolean
  /** The document to start from; null for none. The editor is uncontrolled after that. */
  initialValue: RichTextDocument | null
  /** Called after each content change (not selection changes) with the document, or null when it is empty. */
  onChange: (value: RichTextDocument | null) => void
}

function NormalizationPlugin() {
  const [editor] = useLexicalComposerContext()
  useEffect(() => registerRichTextNormalization(editor), [editor])
  return null
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState<ToolbarState>(EMPTY_TOOLBAR_STATE)
  const [dialog, setDialog] = useState<{ open: boolean; url: string | null }>({ open: false, url: null })

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        const next = editorState.read($readToolbarState)
        setState((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next))
      }),
    [editor],
  )

  const press = (button: ToolbarButton) => {
    if (button === 'link') {
      openLinkDialog()
      return
    }
    applyToolbarAction(editor, button, state)
  }

  const openLinkDialog = () => {
    setDialog({ open: true, url: editor.getEditorState().read($readSelectedLinkUrl) })
  }
  const close = () => setDialog((previous) => ({ ...previous, open: false }))
  const finish = (url: string | null) => {
    close()
    editor.focus(() => applyLink(editor, url))
  }

  return (
    <>
      <RichTextToolbar state={state} onAction={press} />
      <RichTextLinkDialog
        open={dialog.open}
        editingUrl={dialog.url}
        onSave={finish}
        onRemove={() => finish(null)}
        onClose={close}
        onCloseFocus={() => editor.focus()}
      />
    </>
  )
}

/**
 * The Lexical rich-text editor for Keeper notes (specs/scenario-preparation/ux.md section 15): a toolbar above an
 * editable area limited to the allowed nodes. Tab and Shift+Tab leave the editor (SP-A11Y-14), because no tab or
 * indentation plugin is registered.
 */
export function RichTextEditor({ id, labelledBy, describedBy, invalid, initialValue, onChange }: RichTextEditorProps) {
  const [initialConfig] = useState(() => ({
    namespace: 'rich-text-editor',
    nodes: [...RICH_TEXT_NODES],
    theme: RICH_TEXT_THEME,
    editorState: initialValue ? JSON.stringify(initialValue) : undefined,
    onError: (error: Error) => {
      throw error
    },
  }))

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="rounded-md border border-input shadow-sm focus-within:ring-2 focus-within:ring-ring aria-[invalid=true]:border-destructive" aria-invalid={invalid ? true : undefined}>
        <ToolbarPlugin />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              id={id}
              aria-labelledby={labelledBy}
              aria-describedby={describedBy}
              aria-invalid={invalid ? true : undefined}
              aria-multiline={true}
              className="min-h-48 max-w-full px-3 py-2 text-sm break-words outline-none"
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin validateUrl={isAllowedLinkUrl} attributes={LINK_ATTRIBUTES} />
      <NormalizationPlugin />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(editorState) => {
          const document = editorState.toJSON() as unknown as RichTextDocument
          onChange(isEmptyRichText(document) ? null : document)
        }}
      />
    </LexicalComposer>
  )
}
