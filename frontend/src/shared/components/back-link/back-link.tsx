import type { ReactNode } from 'react'

import { resolveBackLink, type BackLinkTarget, type Origin } from './backLinkOrigin'

interface BackLinkProps<TTarget extends BackLinkTarget> {
  from: unknown
  fallback: TTarget
  originTargets: Record<Origin, TTarget>
  /**
   * Renders the resolved target as the page's back link. The render builds the router Link at the call site, where the
   * target routes are literal, so `shared` never names a slice route.
   */
  render: (target: TTarget) => ReactNode
}

/**
 * A back link that remembers its origin (specs/navigation/ux.md section 4): with an allow-listed `from` it renders the
 * origin target, otherwise the page's structural fallback, silently. The decision is the pure `resolveBackLink`.
 */
export function BackLink<TTarget extends BackLinkTarget>({ from, fallback, originTargets, render }: BackLinkProps<TTarget>) {
  return render(resolveBackLink(from, fallback, originTargets))
}
