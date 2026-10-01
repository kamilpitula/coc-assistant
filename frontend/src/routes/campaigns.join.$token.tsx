import { createFileRoute } from '@tanstack/react-router'

import { JoinCampaign } from '@/campaign-play/components/join-campaign/join-campaign'
import { Header } from '@/shared/components/header/header'

export const Route = createFileRoute('/campaigns/join/$token')({
  component: JoinCampaignPage,
})

function JoinCampaignPage() {
  const { token } = Route.useParams()

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-16">
        <JoinCampaign token={token} />
      </main>
    </div>
  )
}
