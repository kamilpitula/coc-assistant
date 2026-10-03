import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

import type { CampaignRole, CampaignView } from '@/campaign-play/types/Campaign'
import { cn } from '@/shared/components/utils'

/** The Campaign navigation entry a page belongs to; sheet, wizard, and review pages belong to the overview. */
export type CampaignSection = 'overview' | 'settings'

interface CampaignHeaderProps {
  campaign: Pick<CampaignView, 'id' | 'name' | 'era'> & { role: CampaignRole }
  section: CampaignSection
  /** On the overview the Campaign name is the page h1; other pages have their own h1. */
  isOverview: boolean
}

/** The header on every Campaign page: back link, name, Era, and Campaign navigation (specs/campaign-overview/ux.md section 2). */
export function CampaignHeader({ campaign, section, isOverview }: CampaignHeaderProps) {
  const NameElement = isOverview ? 'h1' : 'p'

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
      <nav aria-label="Campaign" className="mt-2 flex gap-4">
        <CampaignNavLink to="/campaigns/$campaignId" campaignId={campaign.id} current={section === 'overview'}>
          Overview
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
  to: '/campaigns/$campaignId' | '/campaigns/$campaignId/settings'
  campaignId: string
  current: boolean
  children: string
}

/** A navigation link at least 44px high; the current one has a border and weight, not only a colour (CO-A11Y-2). */
function CampaignNavLink({ to, campaignId, current, children }: CampaignNavLinkProps) {
  return (
    <Link
      to={to}
      params={{ campaignId }}
      aria-current={current ? 'page' : undefined}
      className={cn(
        '-mb-px inline-flex min-h-11 items-center border-b-2 px-1 text-sm whitespace-nowrap',
        current ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  )
}
