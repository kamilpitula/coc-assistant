import { Link, useRouterState } from '@tanstack/react-router'

import { InviteManagement } from '@/campaign-play/components/invite-management/invite-management'
import { RulesOptions } from '@/campaign-play/components/rules-options/rules-options'
import { YourInvestigatorCard } from '@/campaign-play/components/your-investigator-card/your-investigator-card'
import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import type { PlayerCampaign } from '@/campaign-play/types/Campaign'
import '@/campaign-play/types/navigationState'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface CampaignPageProps {
  campaignId: string
}

/** The Campaign page, rendered by the caller's role (specs/character-sheet/ux.md section 3). */
export function CampaignPage({ campaignId }: CampaignPageProps) {
  const campaign = useCampaign(campaignId)

  if (campaign.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    )
  }

  if (campaign.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Campaign.</p>
        <Button type="button" variant="outline" onClick={() => void campaign.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!campaign.data) {
    return <CampaignNotFound />
  }

  if (campaign.data.role === 'Player') {
    return <PlayerCampaignView campaign={campaign.data} />
  }

  return (
    <>
      <InviteManagement campaignId={campaignId} />
      <RulesOptions campaignId={campaignId} />
    </>
  )
}

function CampaignNotFound() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Campaign</h1>
      <Link to="/campaigns" className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        Back to Campaigns
      </Link>
    </section>
  )
}

/** The Player's read-only Campaign view (ux.md section 3.2). */
function PlayerCampaignView({ campaign }: { campaign: PlayerCampaign }) {
  const statusMessage = useRouterState({ select: (state) => state.location.state.statusMessage })

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{campaign.name}</h1>
      <p role="status" className="text-sm empty:hidden">
        {statusMessage}
      </p>
      <YourInvestigatorCard campaign={campaign} />
    </section>
  )
}
