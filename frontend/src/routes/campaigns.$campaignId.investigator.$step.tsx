import { createFileRoute, redirect } from '@tanstack/react-router'

import { InvestigatorWizard } from '@/campaign-play/components/investigator-wizard/investigator-wizard'
import { isWizardStep } from '@/campaign-play/services/wizardProgress'
import { Header } from '@/shared/components/header/header'

export const Route = createFileRoute('/campaigns/$campaignId/investigator/$step')({
  // Steps outside this delivery's wizard (specs/character-sheet/ux.md section 9) resume instead.
  beforeLoad: ({ params }) => {
    if (!isWizardStep(params.step)) {
      throw redirect({ to: '/campaigns/$campaignId/investigator', params: { campaignId: params.campaignId } })
    }
  },
  component: InvestigatorWizardPage,
})

function InvestigatorWizardPage() {
  const { campaignId, step } = Route.useParams()

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-16">
        {isWizardStep(step) && <InvestigatorWizard campaignId={campaignId} step={step} />}
      </main>
    </div>
  )
}
