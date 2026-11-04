import type { ReactNode } from 'react'

import { HeadingOffsetContext } from './heading-offset-context'

interface HeadingOffsetProviderProps {
  /** How many levels deeper the body's headings render: +1 for the Clues panel, +3 for an entity profile, -1 for Handouts. */
  value: number
  children: ReactNode
}

/**
 * Shifts the headings of an extracted body inside a side panel (PBI-NAV-002 design record D5): heading components read the
 * offset through `useHeadingTag`, and `RichTextView` adds it to its own offset. Pages render without a provider, so their
 * levels are unchanged.
 */
export function HeadingOffsetProvider({ value, children }: HeadingOffsetProviderProps) {
  return <HeadingOffsetContext.Provider value={value}>{children}</HeadingOffsetContext.Provider>
}
