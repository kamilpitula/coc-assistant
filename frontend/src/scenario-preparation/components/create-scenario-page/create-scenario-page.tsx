import { Link, useNavigate } from '@tanstack/react-router'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ScenarioForm } from '@/scenario-preparation/components/scenario-form/scenario-form'
import { ScenarioNotFound } from '@/scenario-preparation/components/scenario-not-found/scenario-not-found'
import { useCreateScenario } from '@/scenario-preparation/hooks/useScenarios'
import { ScenarioValidationError } from '@/scenario-preparation/services/scenarioApi'
import { buttonVariants } from '@/shared/components/ui/button'

const EMPTY_SCENARIO = { title: '', keeperNotes: '' }

interface CreateScenarioPageProps {
  campaignId: string
}

/**
 * "Create Scenario" (specs/scenario-preparation/ux.md section 4). The layout route renders the Campaign header and
 * loads the Campaign, so its role is already known: a Player sees the not-found page and no request is made.
 */
export function CreateScenarioPage({ campaignId }: CreateScenarioPageProps) {
  const campaign = useCampaign(campaignId)
  const creation = useCreateScenario(campaignId)
  const navigate = useNavigate()

  if (campaign.data?.role !== 'Keeper') {
    return <ScenarioNotFound campaignId={campaignId} />
  }

  const validationError = creation.error instanceof ScenarioValidationError ? creation.error : null
  const failed = creation.isError && validationError === null

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Create Scenario</h1>
      <ScenarioForm
        initialValues={EMPTY_SCENARIO}
        submitLabel="Create Scenario"
        busyLabel="Creating..."
        pending={creation.isPending}
        failureMessage={failed ? "We couldn't create the Scenario. Try again." : null}
        serverErrors={validationError?.fieldErrors}
        cancel={
          <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
            Cancel
          </Link>
        }
        onSubmit={(values) =>
          creation.mutate(values, {
            onSuccess: (scenario) =>
              void navigate({
                to: '/campaigns/$campaignId/scenarios/$scenarioId',
                params: { campaignId, scenarioId: scenario.id },
                state: { statusMessage: 'Scenario created.' },
              }),
          })
        }
      />
    </div>
  )
}
