import { createFileRoute } from '@tanstack/react-router'

import { CampaignPage } from '@/campaign-play/components/campaign-page/campaign-page'
import { Header } from '@/shared/components/header/header'

export const Route = createFileRoute('/campaigns/$campaignId/')({
  component: CampaignDetailPage,
})

function CampaignDetailPage() {
  const { campaignId } = Route.useParams()

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-12 px-6 py-12 md:px-16">
        <CampaignPage campaignId={campaignId} />
      </main>
    </div>
  )
}
