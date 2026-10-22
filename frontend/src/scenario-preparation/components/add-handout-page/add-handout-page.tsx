import { Link, useNavigate } from '@tanstack/react-router'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { HandoutForm } from '@/scenario-preparation/components/handout-form/handout-form'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { useCreateHandout } from '@/scenario-preparation/hooks/useHandouts'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { HandoutNotFoundError, HandoutValidationError } from '@/scenario-preparation/services/handoutApi'
import { HANDOUT_SCENE_FINISHED_MEANWHILE, type HandoutFormValues } from '@/scenario-preparation/services/handoutForm'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

const EMPTY_HANDOUT: HandoutFormValues = { title: '', kind: null, visibility: null, content: null }

interface AddHandoutPageProps {
  campaignId: string
  scenarioId: string
  sceneId: string
}

function failureMessageFor(error: unknown): string | null {
  if (!error || error instanceof HandoutValidationError) {
    return null
  }
  return error instanceof SceneFinishedError ? HANDOUT_SCENE_FINISHED_MEANWHILE : "We couldn't add the Handout. Try again."
}

/**
 * "Add Handout" (specs/scenario-preparation/ux.md section 43). A Player or an unknown Scene gets the Scene not-found page and
 * no request is made; a Finished Scene gets the sentence that it can't be changed instead of the form.
 */
export function AddHandoutPage({ campaignId, scenarioId, sceneId }: AddHandoutPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scene = useScene(campaignId, scenarioId, sceneId, isKeeper)
  const creating = useCreateHandout(campaignId, scenarioId, sceneId)
  const navigate = useNavigate()

  if (!isKeeper || scene.data === null || creating.error instanceof HandoutNotFoundError) {
    return <SceneNotFound campaignId={campaignId} />
  }

  if (!scene.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const backToScene = (
    <Link
      to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
      params={{ campaignId, scenarioId, sceneId }}
      className={buttonVariants({ variant: 'link', className: 'px-0' })}
    >
      {scene.data.status === 'Finished' ? 'Back to the Scene' : 'Cancel'}
    </Link>
  )

  if (scene.data.status === 'Finished') {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">Add Handout</h1>
        <p className="text-sm text-muted-foreground">This Scene is finished and can&apos;t be changed.</p>
        {backToScene}
      </div>
    )
  }

  const validationError = creating.error instanceof HandoutValidationError ? creating.error : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Add Handout</h1>
        <p className="text-sm break-words text-muted-foreground">Scene: {scene.data.title}</p>
      </div>
      <HandoutForm
        initialValues={EMPTY_HANDOUT}
        submitLabel="Add Handout"
        busyLabel="Adding..."
        pending={creating.isPending}
        failureMessage={failureMessageFor(creating.error)}
        serverErrors={validationError?.fieldErrors}
        cancel={backToScene}
        onSubmit={(input) =>
          creating.mutate(input, {
            onSuccess: (handout) =>
              void navigate({
                to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
                params: { campaignId, scenarioId, sceneId },
                state: { statusMessage: `${handout.title} added.`, focusHandoutId: handout.id },
              }),
          })
        }
      />
    </div>
  )
}
