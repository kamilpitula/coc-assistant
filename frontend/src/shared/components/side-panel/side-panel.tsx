import type { ReactNode, RefObject } from 'react'

import { useSidePanelScope } from './side-panel-scope-context'
import { Sheet, SheetContent } from '@/shared/components/ui/sheet'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  /** The host page h1, for focus return when the opening control is gone (a reload, or the subject left the list). */
  fallbackRef?: RefObject<HTMLElement | null>
  children: ReactNode
}

/**
 * The side panel shell (specs/navigation/ux.md section 3): a modal `Sheet` from the right, labelled by the panel h2.
 * Focus moves to the h2 on open; on close it returns to the control that opened the panel, or to the host page h1.
 * The host page maps the open panel to its body (PBI-NAV-002 design record D4).
 */
export function SidePanel({ open, onClose, fallbackRef, children }: SidePanelProps) {
  const { triggerRef, titleRef, titleId } = useSidePanelScope()

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose()
      }
    }}>
      <SheetContent
        aria-labelledby={titleId}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          titleRef.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const trigger = triggerRef.current
          if (trigger !== null && trigger.isConnected) {
            trigger.focus()
          } else {
            fallbackRef?.current?.focus()
          }
        }}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}
