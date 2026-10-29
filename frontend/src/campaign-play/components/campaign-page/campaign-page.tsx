import { useRouterState } from '@tanstack/react-router'

import { AttentionList } from '@/campaign-play/components/attention-list/attention-list'
import { CampaignTable } from '@/campaign-play/components/campaign-table/campaign-table'
import { WallPreview } from '@/campaign-play/components/wall-preview/wall-preview'
import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ActiveSceneCard } from '@/scene-play/components/active-scene-card/active-scene-card'
import { ItemSummarySection } from '@/scenario-preparation/components/item-summary-section/item-summary-section'
import { NonPlayerEntitySummarySection } from '@/scenario-preparation/components/non-player-entity-summary-section/non-player-entity-summary-section'
import { ScenarioListSection } from '@/scenario-preparation/components/scenario-list-section/scenario-list-section'

interface CampaignPageProps {
  campaignId: string
}

/**
 * The Campaign overview, one layout for both roles (specs/campaign-overview/ux.md section 3): the status message,
 * "Needs your attention", "At the table", the Keeper's "Scenarios" (specs/scenario-preparation/ux.md section 2) and "Non-Player Entities" (section 22), then the Wall
 * preview, which sits in a right column from 1024px. The layout route renders the Campaign header and handles loading,
 * errors, and not-found, so the Campaign is already in the query cache here.
 */
export function CampaignPage({ campaignId }: CampaignPageProps) {
  const campaign = useCampaign(campaignId)
  const statusMessage = useRouterState({ select: (state) => state.location.state.statusMessage })

  if (!campaign.data) {
    return null
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="flex min-w-0 flex-col gap-6">
        <p role="status" className="text-sm empty:hidden">
          {statusMessage}
        </p>
        <AttentionList campaign={campaign.data} />
        <ActiveSceneCard campaignId={campaignId} isKeeper={campaign.data.role === 'Keeper'} />
        <CampaignTable campaignId={campaignId} />
        {campaign.data.role === 'Keeper' && (
          <>
            <ScenarioListSection campaignId={campaignId} />
            <NonPlayerEntitySummarySection campaignId={campaignId} />
            <ItemSummarySection campaignId={campaignId} />
          </>
        )}
      </div>
      <WallPreview campaignId={campaignId} />
    </div>
  )
}
