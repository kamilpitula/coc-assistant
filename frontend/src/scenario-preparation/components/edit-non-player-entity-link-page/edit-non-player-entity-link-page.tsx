import { Link, useNavigate } from '@tanstack/react-router'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { NonPlayerEntityLinkNotFound } from '@/scenario-preparation/components/non-player-entity-link-not-found/non-player-entity-link-not-found'
import { SceneLinkForm } from '@/scenario-preparation/components/scene-link-form/scene-link-form'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { useEditNonPlayerEntityLink } from '@/scenario-preparation/hooks/useNonPlayerEntityLinks'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import {
  NonPlayerEntityLinkNotFoundError,
  NonPlayerEntityLinkValidationError,
} from '@/scenario-preparation/services/nonPlayerEntityLinkApi'
import { LINK_SCENE_FINISHED_MEANWHILE } from '@/scenario-preparation/services/nonPlayerEntityLinkForm'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { NON_PLAYER_ENTITY_TYPE_LABELS } from '@/scenario-preparation/types/NonPlayerEntity'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface EditNonPlayerEntityLinkPageProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  linkId: string
}

function failureMessageFor(error: unknown): string | null {
  if (!error || error instanceof NonPlayerEntityLinkValidationError) {
    return null
  }
  return error instanceof SceneFinishedError ? LINK_SCENE_FINISHED_MEANWHILE : "We couldn't save the link. Try again."
}

/**
 * "Edit {name}" (specs/scenario-preparation/ux.md section 33): the entity as text, the fields prefilled. A Player or an unknown
 * Scene gets the Scene not-found page; an unknown link, or a 404 on save, gets the link not-found page.
 */
export function EditNonPlayerEntityLinkPage({ campaignId, scenarioId, sceneId, linkId }: EditNonPlayerEntityLinkPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scene = useScene(campaignId, scenarioId, sceneId, isKeeper)
  const editing = useEditNonPlayerEntityLink(campaignId, scenarioId, sceneId, linkId)

  if (!isKeeper || scene.data === null) {
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

  return (
    <EditLinkContent
      campaignId={campaignId}
      scenarioId={scenarioId}
      sceneId={sceneId}
      linkId={linkId}
      scene={scene.data}
      editing={editing}
    />
  )
}

interface EditLinkContentProps extends EditNonPlayerEntityLinkPageProps {
  scene: Scene
  editing: ReturnType<typeof useEditNonPlayerEntityLink>
}

function EditLinkContent({ campaignId, scenarioId, sceneId, linkId, scene, editing }: EditLinkContentProps) {
  const navigate = useNavigate()
  const link = scene.nonPlayerEntityLinks.find((candidate) => candidate.id === linkId)
  if (!link || editing.error instanceof NonPlayerEntityLinkNotFoundError) {
    return <NonPlayerEntityLinkNotFound campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
  }

  const backToScene = (
    <Link
      to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
      params={{ campaignId, scenarioId, sceneId }}
      className={buttonVariants({ variant: 'link', className: 'px-0' })}
    >
      {scene.status === 'Finished' ? 'Back to the Scene' : 'Cancel'}
    </Link>
  )

  if (scene.status === 'Finished') {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold break-words">Edit {link.playerFacingName}</h1>
        <p className="text-sm text-muted-foreground">This Scene is finished and can&apos;t be changed.</p>
        {backToScene}
      </div>
    )
  }

  const validationError = editing.error instanceof NonPlayerEntityLinkValidationError ? editing.error : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold break-words">Edit {link.playerFacingName}</h1>
        <p className="text-sm break-words text-muted-foreground">Scene: {scene.title}</p>
        <p className="text-sm break-words text-muted-foreground">
          {NON_PLAYER_ENTITY_TYPE_LABELS[link.nonPlayerEntity.type]}: {link.nonPlayerEntity.name}
        </p>
      </div>
      <SceneLinkForm
        initialValues={{ nonPlayerEntity: null, playerFacingName: link.playerFacingName, playerFacingDescription: link.playerFacingDescription }}
        submitLabel="Save"
        busyLabel="Saving..."
        pending={editing.isPending}
        failureMessage={failureMessageFor(editing.error)}
        serverErrors={validationError?.fieldErrors}
        cancel={backToScene}
        onSubmit={(values) =>
          editing.mutate(
            { playerFacingName: values.playerFacingName, playerFacingDescription: values.playerFacingDescription },
            {
              onSuccess: (saved) =>
                void navigate({
                  to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
                  params: { campaignId, scenarioId, sceneId },
                  state: { statusMessage: `${saved.playerFacingName} saved.`, focusLinkId: saved.id },
                }),
            },
          )
        }
      />
    </div>
  )
}
