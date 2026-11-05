import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

import { useSidePanelScope } from './side-panel-scope-context'

export type SidePanelContentState = 'loading' | 'error' | 'not-found' | 'ready'

interface SidePanelContentProps {
  /** The kind line above the title: "Clues", "Non-Player Entity", "Handout", "Revealed". */
  kindLabel: string
  /** The subject title once known; the kind label shows until then and in the error and not-found states. */
  title: string | null
  state: SidePanelContentState
  onRetry?: () => void
  /** The "Open full page" link, shown only when ready. */
  footer?: ReactNode
  /** One context action, shown only when ready. */
  action?: ReactNode
  children?: ReactNode
}

/**
 * The body of a side panel (specs/navigation/ux.md section 3): the kind line, the h2 title, the loading, error, and
 * not-found states, and the ready footer link with its action slot. The h2 is the same element in every state, so focus
 * stays on it while the body loads.
 */
export function SidePanelContent({ kindLabel, title, state, onRetry, footer, action, children }: SidePanelContentProps) {
  const { titleRef, titleId } = useSidePanelScope()

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-6 py-4">
      <p className="text-sm text-muted-foreground">{kindLabel}</p>
      <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-xl font-semibold break-words outline-none">
        {state === 'error' || state === 'not-found' ? kindLabel : (title ?? kindLabel)}
      </h2>
      {state === 'loading' ? (
        <Skeleton aria-busy="true" className="h-20 w-full" />
      ) : state === 'error' ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm">We couldn&apos;t load this.</p>
          <Button type="button" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : state === 'not-found' ? (
        <p className="text-sm">We couldn&apos;t find that.</p>
      ) : (
        <>
          {children}
          {(footer ?? action) && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {action}
              {footer}
            </div>
          )}
        </>
      )}
    </div>
  )
}
