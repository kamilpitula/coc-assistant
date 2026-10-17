import type { ReactNode } from 'react'

interface StickyFormActionsProps {
  children: ReactNode
}

/**
 * The Save and Cancel bar, stuck to the bottom of the viewport with the page background and a top border
 * (specs/scenario-preparation/ux.md section 25.2). The form that holds it has a scroll padding equal to the bar's height,
 * so a focused field is never hidden behind it (SP-A11Y-24).
 */
export function StickyFormActions({ children }: StickyFormActionsProps) {
  return <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background py-3">{children}</div>
}
