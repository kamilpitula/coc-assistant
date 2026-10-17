import { Link, useNavigate } from '@tanstack/react-router'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { SceneForm } from '@/scenario-preparation/components/scene-form/scene-form'
import { ScenarioNotFound } from '@/scenario-preparation/components/scenario-not-found/scenario-not-found'
import { useScenario } from '@/scenario-preparation/hooks/useScenarios'
import { useCreateScene } from '@/scenario-preparation/hooks/useScenes'
import { SceneValidationError } from '@/scenario-preparation/services/sceneApi'
import type { SceneInput } from '@/scenario-preparation/types/Scene'
import { buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

const EMPTY_SCENE: SceneInput = { title: '', location: '', keeperNotes: null }

interface CreateScenePageProps {
  campaignId: string
  scenarioId: string
}

/**
 * "Create Scene" (specs/scenario-preparation/ux.md section 13). The layout route loads the Campaign, so its role is
 * already known: a Player sees the Scenario not-found page and no request is made.
 */
export function CreateScenePage({ campaignId, scenarioId }: CreateScenePageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scenario = useScenario(campaignId, scenarioId, isKeeper)
  const creation = useCreateScene(campaignId, scenarioId)
  const navigate = useNavigate()

  if (!isKeeper || scenario.data === null) {
    return <ScenarioNotFound campaignId={campaignId} />
  }

  if (!scenario.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const validationError = creation.error instanceof SceneValidationError ? creation.error : null
  const failed = creation.isError && validationError === null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Create Scene</h1>
        <p className="text-sm break-words text-muted-foreground">Scenario: {scenario.data.title}</p>
      </div>
      <SceneForm
        initialValues={EMPTY_SCENE}
        submitLabel="Create Scene"
        busyLabel="Creating..."
        pending={creation.isPending}
        failureMessage={failed ? "We couldn't create the Scene. Try again." : null}
        serverErrors={validationError?.fieldErrors}
        cancel={
          <Link
            to="/campaigns/$campaignId/scenarios/$scenarioId"
            params={{ campaignId, scenarioId }}
            className={buttonVariants({ variant: 'link', className: 'px-0' })}
          >
            Cancel
          </Link>
        }
        onSubmit={(values) =>
          creation.mutate(values, {
            onSuccess: (scene) =>
              void navigate({
                to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
                params: { campaignId, scenarioId, sceneId: scene.id },
                state: { statusMessage: 'Scene created.' },
              }),
          })
        }
      />
    </div>
  )
}
