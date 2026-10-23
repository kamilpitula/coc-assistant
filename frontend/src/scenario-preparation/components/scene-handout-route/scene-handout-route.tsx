import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { AddHandoutPage } from '@/scenario-preparation/components/add-handout-page/add-handout-page'
import { HandoutPage } from '@/scenario-preparation/components/handout-page/handout-page'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { useSceneHandoutContext } from '@/scenario-preparation/hooks/useSceneHandoutContext'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface SceneHandoutRouteProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  /** The Handout to show; without one the page adds a Handout. */
  handoutId?: string
}

/**
 * The Handout pages of a Scene: loads the Scene, turns it into what the Handout screens need to know, and shows the Handout or
 * the "Add Handout" page. A Player and an unknown Scene get the Scene not-found page and make no request (ux.md sections 42 and 43).
 */
export function SceneHandoutRoute({ campaignId, scenarioId, sceneId, handoutId }: SceneHandoutRouteProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const owner: SceneHandoutOwner = { type: 'scene', campaignId, scenarioId, sceneId }
  const { scene, context } = useSceneHandoutContext(owner, isKeeper)

  if (!isKeeper || scene.data === null) {
    return <SceneNotFound campaignId={campaignId} />
  }

  if (scene.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this {handoutId ? 'Handout' : 'Scene'}.</p>
        <Button type="button" variant="outline" onClick={() => void scene.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!context) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return handoutId ? (
    <HandoutPage owner={owner} handoutId={handoutId} context={context} />
  ) : (
    <AddHandoutPage owner={owner} context={context} ownerNotFound={<SceneNotFound campaignId={campaignId} />} />
  )
}
