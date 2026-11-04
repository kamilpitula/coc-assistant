import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import type { CampaignRole, CampaignView } from '@/campaign-play/types/Campaign'
import type { CampaignSection } from '@/campaign-play/services/campaignSection'
import { LiveBadge } from '@/shared/components/live-badge/live-badge'
import { cn } from '@/shared/components/utils'

export type { CampaignSection } from '@/campaign-play/services/campaignSection'

interface CampaignHeaderProps {
  campaign: Pick<CampaignView, 'id' | 'name' | 'era'> & { role: CampaignRole }
  section: CampaignSection
  /** On the overview the Campaign name is the page h1; other pages have their own h1. */
  isOverview: boolean
  /** Whether a Scene is Active; the Active Scene tab shows the Live badge exactly then. */
  hasActiveScene: boolean
}

/** The header on every Campaign page: back link, name, Era, and Campaign navigation (specs/campaign-overview/ux.md section 2). */
export function CampaignHeader({ campaign, section, isOverview, hasActiveScene }: CampaignHeaderProps) {
  const NameElement = isOverview ? 'h1' : 'p'
  const navRef = useRef<HTMLElement>(null)

  // The tab row scrolls inside itself on narrow screens; keep the current tab visible without moving focus.
  // Re-runs when Live appears or disappears because the badge shifts the tabs.
  useEffect(() => {
    const nav = navRef.current
    const current = nav?.querySelector('[aria-current="page"]')
    if (!nav || !current) {
      return
    }
    const navBox = nav.getBoundingClientRect()
    const linkBox = current.getBoundingClientRect()
    if (linkBox.right > navBox.right) {
      nav.scrollLeft += linkBox.right - navBox.right
    } else if (linkBox.left < navBox.left) {
      nav.scrollLeft -= navBox.left - linkBox.left
    }
  }, [section, hasActiveScene])

  return (
    <header className="flex flex-col gap-1 border-b">
      <Link
        to="/campaigns"
        className="inline-flex min-h-6 items-center gap-1 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to Campaigns
      </Link>
      <NameElement className="break-words text-2xl font-semibold">{campaign.name}</NameElement>
      <p className="text-sm text-muted-foreground">{campaign.era}</p>
      <nav ref={navRef} aria-label="Campaign" className="mt-2 flex gap-4 overflow-x-auto overflow-y-hidden sm:overflow-visible">
        <CampaignNavLink to="/campaigns/$campaignId" campaignId={campaign.id} current={section === 'overview'} exact>
          Overview
        </CampaignNavLink>
        <CampaignNavLink
          to="/campaigns/$campaignId/active-scene"
          campaignId={campaign.id}
          current={section === 'active-scene'}
          badge={hasActiveScene ? <LiveBadge /> : undefined}
          ariaLabel={hasActiveScene ? 'Active Scene, live' : undefined}
        >
          Active Scene
        </CampaignNavLink>
        <CampaignNavLink to="/campaigns/$campaignId/wall" campaignId={campaign.id} current={section === 'wall'}>
          Wall
        </CampaignNavLink>
        {campaign.role === 'Keeper' && (
          <CampaignNavLink to="/campaigns/$campaignId/settings" campaignId={campaign.id} current={section === 'settings'}>
            Settings
          </CampaignNavLink>
        )}
      </nav>
    </header>
  )
}

interface CampaignNavLinkProps {
  to: '/campaigns/$campaignId' | '/campaigns/$campaignId/active-scene' | '/campaigns/$campaignId/wall' | '/campaigns/$campaignId/settings'
  campaignId: string
  current: boolean
  /** Exact router-active matching; the Overview path prefixes every Campaign page, so without it the router marks two tabs current. */
  exact?: boolean
  badge?: ReactNode
  ariaLabel?: string
  children: string
}

/** A navigation link at least 44px high; the current one has a border and weight, not only a colour (CO-A11Y-2). */
function CampaignNavLink({ to, campaignId, current, exact, badge, ariaLabel, children }: CampaignNavLinkProps) {
  return (
    <Link
      to={to}
      params={{ campaignId }}
      activeOptions={exact ? { exact: true } : undefined}
      aria-current={current ? 'page' : undefined}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 whitespace-nowrap border-b-2 px-1 sm:-mb-px',
        current ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
      {badge}
    </Link>
  )
}
