import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
  type LucideIcon,
} from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/shared/components/ui/button'
import type { ToolbarAction, ToolbarState } from '@/shared/services/richTextToolbar'

export type ToolbarButton = ToolbarAction | 'link'

interface ToolbarItem {
  id: ToolbarButton
  label: string
  Icon: LucideIcon
}

// The order of specs/scenario-preparation/ux.md section 15: text formats, blocks, link.
const ITEMS: readonly ToolbarItem[] = [
  { id: 'bold', label: 'Bold', Icon: Bold },
  { id: 'italic', label: 'Italic', Icon: Italic },
  { id: 'underline', label: 'Underline', Icon: Underline },
  { id: 'strikethrough', label: 'Strikethrough', Icon: Strikethrough },
  { id: 'heading', label: 'Heading', Icon: Heading2 },
  { id: 'subheading', label: 'Subheading', Icon: Heading3 },
  { id: 'quote', label: 'Quote', Icon: Quote },
  { id: 'bulleted-list', label: 'Bulleted list', Icon: List },
  { id: 'numbered-list', label: 'Numbered list', Icon: ListOrdered },
  { id: 'link', label: 'Link', Icon: LinkIcon },
]

/** The index Arrow, Home, and End keys move to, or null for any other key. */
function targetIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count
    case 'ArrowLeft':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

interface RichTextToolbarProps {
  state: ToolbarState
  onAction: (button: ToolbarButton) => void
}

/**
 * The formatting toolbar of the rich-text editor: one tab stop with Arrow, Home, and End navigation, and a toggle
 * button per format (specs/scenario-preparation/ux.md section 15; SP-A11Y-13).
 */
export function RichTextToolbar({ state, onAction }: RichTextToolbarProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = targetIndex(event.key, index, ITEMS.length)
    if (next === null) {
      return
    }
    event.preventDefault()
    setActiveIndex(next)
    buttons.current[next]?.focus()
  }

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-1 border-b p-1">
      {ITEMS.map((item, index) => (
        <Button
          key={item.id}
          ref={(element) => {
            buttons.current[index] = element
          }}
          type="button"
          variant={state[item.id] ? 'secondary' : 'ghost'}
          size="icon"
          className="size-10"
          aria-pressed={state[item.id]}
          tabIndex={index === activeIndex ? 0 : -1}
          onMouseDown={(event) => event.preventDefault()}
          onFocus={() => setActiveIndex(index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onClick={() => {
            setActiveIndex(index)
            onAction(item.id)
          }}
        >
          <item.Icon aria-hidden="true" />
          <span className="sr-only">{item.label}</span>
        </Button>
      ))}
    </div>
  )
}
