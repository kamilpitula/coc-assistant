import { createFileRoute } from '@tanstack/react-router'

import { InviteManagement } from '@/campaign-play/components/invite-management/invite-management'
import { RulesOptions } from '@/campaign-play/components/rules-options/rules-options'
import { Header } from '@/shared/components/header/header'

export const Route = createFileRoute('/campaigns/$campaignId')({
  component: CampaignDetailPage,
})

function CampaignDetailPage() {
  const { campaignId } = Route.useParams()

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-12 px-6 py-12 md:px-16">
        <InviteManagement campaignId={campaignId} />
        <RulesOptions campaignId={campaignId} />
      </main>
    </div>
  )
}

