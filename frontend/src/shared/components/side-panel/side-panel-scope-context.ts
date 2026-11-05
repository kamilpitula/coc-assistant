import { createContext, useContext, type RefObject } from 'react'

interface SidePanelScopeValue {
  /** The control that opened the panel, for focus return; null when the page was loaded with panel params. */
  triggerRef: RefObject<HTMLElement | null>
  /** The panel h2, for focus on open. */
  titleRef: RefObject<HTMLHeadingElement | null>
  /** The id of the panel h2, so the dialog is labelled by it. */
  titleId: string
}

const SidePanelScopeContext = createContext<SidePanelScopeValue | null>(null)

/** The panel scope; openers and the panel must render inside the host page's provider. */
export function useSidePanelScope(): SidePanelScopeValue {
  const scope = useContext(SidePanelScopeContext)
  if (scope === null) {
    throw new Error('useSidePanelScope must be used inside a SidePanelScopeProvider')
  }
  return scope
}

export { SidePanelScopeContext }
export type { SidePanelScopeValue }
