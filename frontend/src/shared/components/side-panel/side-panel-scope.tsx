import { useId, useRef, useState, type ReactNode } from 'react'

import { SidePanelScopeContext, type SidePanelScopeValue } from './side-panel-scope-context'

interface SidePanelScopeProviderProps {
  children: ReactNode
}

/**
 * The panel scope of a host page (PBI-NAV-002 design record D3): one trigger ref and one title ref per page, set by the
 * opener and the panel. The host page renders inside the provider together with its panel.
 */
export function SidePanelScopeProvider({ children }: SidePanelScopeProviderProps) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const titleId = useId()
  const [value] = useState<SidePanelScopeValue>(() => ({ triggerRef, titleRef, titleId }))

  return <SidePanelScopeContext.Provider value={value}>{children}</SidePanelScopeContext.Provider>
}
