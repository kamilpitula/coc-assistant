import { createFileRoute } from '@tanstack/react-router'

import { CampaignList } from '@/campaign-list/components/campaign-list/campaign-list'
import { Header } from '@/shared/components/header/header'
import { RequireSignIn } from '@/shared/components/require-sign-in/require-sign-in'

export const Route = createFileRoute('/campaigns/')({
  component: CampaignsPage,
})

function CampaignsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 px-6 py-8 md:px-16">
        <RequireSignIn heading="Your campaigns">
          <CampaignList />
        </RequireSignIn>
      </main>
    </div>
  )
}
