import { Link } from '@tanstack/react-router'

import { InviteManagement } from '@/campaign-play/components/invite-management/invite-management'
import { RulesOptions } from '@/campaign-play/components/rules-options/rules-options'
import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { buttonVariants } from '@/shared/components/ui/button'

interface CampaignSettingsProps {
  campaignId: string
}

/**
 * The Keeper's Settings: Invite management, then Rules options (specs/campaign-overview/ux.md section 8). A Player
 * gets the not-found page; the Invite and rules endpoints still refuse anyone but the Keeper.
 */
export function CampaignSettings({ campaignId }: CampaignSettingsProps) {
  const campaign = useCampaign(campaignId)

  if (campaign.data?.role !== 'Keeper') {
    return <SettingsNotFound campaignId={campaignId} />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <InviteManagement campaignId={campaignId} />
      <RulesOptions campaignId={campaignId} />
    </div>
  )
}

function SettingsNotFound({ campaignId }: { campaignId: string }) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <Link
        to="/campaigns/$campaignId"
        params={{ campaignId }}
        className={buttonVariants({ variant: 'link', className: 'px-0' })}
      >
        Back to overview
      </Link>
    </section>
  )
}
