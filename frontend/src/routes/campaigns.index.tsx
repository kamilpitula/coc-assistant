import { createFileRoute } from '@tanstack/react-router'

import { CreateCampaignForm } from '@/campaign-play/components/create-campaign-form/create-campaign-form'
import { Header } from '@/shared/components/header/header'

export const Route = createFileRoute('/campaigns/')({
  component: CampaignsPage,
})

function CampaignsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-16">
        <CreateCampaignForm />
      </main>
    </div>
  )
}
