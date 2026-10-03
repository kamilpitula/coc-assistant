import { useRouterState } from '@tanstack/react-router'

import { AttentionList } from '@/campaign-play/components/attention-list/attention-list'
import { CampaignTable } from '@/campaign-play/components/campaign-table/campaign-table'
import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'

interface CampaignPageProps {
  campaignId: string
}

/**
 * The Campaign overview, one layout for both roles (specs/campaign-overview/ux.md section 3): the status message,
 * "Needs your attention", then "At the table". The layout route renders the Campaign header and handles loading,
 * errors, and not-found, so the Campaign is already in the query cache here.
 */
export function CampaignPage({ campaignId }: CampaignPageProps) {
  const campaign = useCampaign(campaignId)
  const statusMessage = useRouterState({ select: (state) => state.location.state.statusMessage })

  if (!campaign.data) {
    return null
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <p role="status" className="text-sm empty:hidden">
        {statusMessage}
      </p>
      <AttentionList campaign={campaign.data} />
      <CampaignTable campaignId={campaignId} />
    </div>
  )
}
