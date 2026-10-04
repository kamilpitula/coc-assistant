import { createFileRoute } from '@tanstack/react-router'

import { CreateCampaignForm } from '@/campaign-play/components/create-campaign-form/create-campaign-form'
import { Header } from '@/shared/components/header/header'
import { RequireSignIn } from '@/shared/components/require-sign-in/require-sign-in'

export const Route = createFileRoute('/campaigns/new')({
  component: NewCampaignPage,
})

function NewCampaignPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 px-6 py-8 md:px-16">
        <RequireSignIn heading="New campaign">
          <CreateCampaignForm />
        </RequireSignIn>
      </main>
    </div>
  )
}
