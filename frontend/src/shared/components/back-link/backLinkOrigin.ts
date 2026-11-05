import { z } from 'zod'

/** The origins a full page accepts in `from` (specs/navigation/ux.md section 4): a closed allow-list, never a URL. */
export const ORIGINS = ['active-scene'] as const

export type Origin = (typeof ORIGINS)[number]

const originSchema = z.enum(ORIGINS).optional().catch(undefined)

/**
 * The search params of a page with an origin back link: `from` names where the viewer came from. Unknown or missing
 * values degrade to an absent `from`, so the page shows its structural back link, silently.
 */
export const originSearchSchema = z.object({
  from: originSchema.optional().catch(undefined),
})

export type OriginSearch = z.infer<typeof originSearchSchema>

/** A back link target: the label after "Back to" plus the router link options of its page. */
export interface BackLinkTarget {
  label: string
  to: string
  params?: Record<string, string | undefined>
  search?: Record<string, string>
}

/**
 * The back link of a page opened with `from` (PBI-NAV-002 design record D6): the allow-listed origin's target,
 * otherwise the page's structural fallback. The function stays pure; the Active Scene title comes from
 * `campaign-play/hooks/useOriginBackLink`, so `shared` never reads slice state. Generic over the target so call sites
 * keep their literal router link types.
 */
export function resolveBackLink<TTarget extends BackLinkTarget>(from: unknown, fallback: TTarget, originTargets: Record<Origin, TTarget>): TTarget {
  const origin = originSchema.parse(from)
  if (origin === undefined) {
    return fallback
  }
  return originTargets[origin] ?? fallback
}
