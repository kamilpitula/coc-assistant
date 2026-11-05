import { Link } from '@tanstack/react-router'

import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/components/utils'
import type { ActiveSceneSubTab } from '@/scene-play/services/activeSceneSubTab'

export interface ActiveSceneSubTabCounts {
  toReveal: number
  reference: number
  revealed: number
}

interface ActiveSceneNavProps {
  campaignId: string
  current: ActiveSceneSubTab
  /** Null while the material the counts derive from is still loading: the links render without counts. */
  counts: ActiveSceneSubTabCounts | null
}

interface SubTabLink {
  tab: ActiveSceneSubTab
  label: string
  to: '/campaigns/$campaignId/active-scene' | '/campaigns/$campaignId/active-scene/to-reveal' | '/campaigns/$campaignId/active-scene/reference' | '/campaigns/$campaignId/active-scene/revealed'
  count?: number
}

/**
 * The sub-navigation under the scene header (specs/scene-play/ux.md section 21.1): Run, To reveal, Keeper reference,
 * and Revealed with live counts, as a segmented control scrolling inside itself below 640px.
 */
export function ActiveSceneNav({ campaignId, current, counts }: ActiveSceneNavProps) {
  const links: SubTabLink[] = [
    { tab: 'run', label: 'Run', to: '/campaigns/$campaignId/active-scene' },
    { tab: 'to-reveal', label: 'To reveal', to: '/campaigns/$campaignId/active-scene/to-reveal', count: counts?.toReveal },
    { tab: 'reference', label: 'Keeper reference', to: '/campaigns/$campaignId/active-scene/reference', count: counts?.reference },
    { tab: 'revealed', label: 'Revealed', to: '/campaigns/$campaignId/active-scene/revealed', count: counts?.revealed },
  ]

  return (
    <nav aria-label="Active Scene" className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {links.map((link) => (
        <Link
          key={link.tab}
          to={link.to}
          params={{ campaignId }}
          aria-current={link.tab === current ? 'page' : undefined}
          aria-label={link.count === undefined ? undefined : `${link.label}, ${link.count}`}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap',
            link.tab === current ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {link.label}
          {link.count === undefined ? null : (
            <Badge variant="secondary" className="px-1.5 tabular-nums">
              {link.count}
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  )
}
