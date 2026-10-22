import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { NonPlayerEntityLinkNotFound } from '@/scenario-preparation/components/non-player-entity-link-not-found/non-player-entity-link-not-found'
import { SceneLinkForm } from '@/scenario-preparation/components/scene-link-form/scene-link-form'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { useNonPlayerEntities } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { useLinkNonPlayerEntity } from '@/scenario-preparation/hooks/useNonPlayerEntityLinks'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import {
  NonPlayerEntityLinkNotFoundError,
  NonPlayerEntityLinkValidationError,
} from '@/scenario-preparation/services/nonPlayerEntityLinkApi'
import { LINK_SCENE_FINISHED_MEANWHILE } from '@/scenario-preparation/services/nonPlayerEntityLinkForm'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

const EMPTY_LINK = { nonPlayerEntity: null, playerFacingName: '', playerFacingDescription: null }

interface LinkNonPlayerEntityPageProps {
  campaignId: string
  scenarioId: string
  sceneId: string
}

function failureMessageFor(error: unknown): string | null {
  if (!error || error instanceof NonPlayerEntityLinkValidationError) {
    return null
  }
  return error instanceof SceneFinishedError ? LINK_SCENE_FINISHED_MEANWHILE : "We couldn't link the Non-Player Entity. Try again."
}

/**
 * "Link a Non-Player Entity" (specs/scenario-preparation/ux.md section 33). A Player or an unknown Scene gets the Scene
 * not-found page and no request is made; a Finished Scene gets the sentence that it can't be changed instead of the form.
 */
export function LinkNonPlayerEntityPage({ campaignId, scenarioId, sceneId }: LinkNonPlayerEntityPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scene = useScene(campaignId, scenarioId, sceneId, isKeeper)
  const entities = useNonPlayerEntities(campaignId, isKeeper)
  const linking = useLinkNonPlayerEntity(campaignId, scenarioId, sceneId)
  const navigate = useNavigate()
  const validationError = linking.error instanceof NonPlayerEntityLinkValidationError ? linking.error : null
  const refetchEntities = entities.refetch

  // A refused entity means the list the Keeper chose from is out of date.
  useEffect(() => {
    if (validationError?.fieldErrors.nonPlayerEntity) {
      void refetchEntities()
    }
  }, [validationError, refetchEntities])

  if (!isKeeper || scene.data === null) {
    return <SceneNotFound campaignId={campaignId} />
  }

  if (linking.error instanceof NonPlayerEntityLinkNotFoundError) {
    return <NonPlayerEntityLinkNotFound campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
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
        <h1 className="text-2xl font-semibold">Link a Non-Player Entity</h1>
        <p className="text-sm text-muted-foreground">This Scene is finished and can&apos;t be changed.</p>
        {backToScene}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Link a Non-Player Entity</h1>
        <p className="text-sm break-words text-muted-foreground">Scene: {scene.data.title}</p>
      </div>
      <SceneLinkForm
        picker={{
          campaignId,
          entities: entities.data,
          isPending: entities.isPending,
          isError: entities.isError,
          onRetry: () => void entities.refetch(),
          linked: scene.data.nonPlayerEntityLinks.map((link) => ({ type: link.nonPlayerEntity.type, id: link.nonPlayerEntity.id })),
        }}
        initialValues={EMPTY_LINK}
        submitLabel="Link"
        busyLabel="Linking..."
        pending={linking.isPending}
        failureMessage={failureMessageFor(linking.error)}
        serverErrors={validationError?.fieldErrors}
        cancel={backToScene}
        onSubmit={(values) => {
          if (!values.nonPlayerEntity) {
            return
          }
          linking.mutate(
            { nonPlayerEntity: values.nonPlayerEntity, playerFacingName: values.playerFacingName, playerFacingDescription: values.playerFacingDescription },
            {
              onSuccess: (link) =>
                void navigate({
                  to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
                  params: { campaignId, scenarioId, sceneId },
                  state: { statusMessage: `${link.playerFacingName} linked.`, focusLinkId: link.id },
                }),
            },
          )
        }}
      />
    </div>
  )
}
