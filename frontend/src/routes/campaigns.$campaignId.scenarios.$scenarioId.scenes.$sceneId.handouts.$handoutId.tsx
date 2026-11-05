import { createFileRoute } from '@tanstack/react-router'

import { SceneHandoutRoute } from '@/scenario-preparation/components/scene-handout-route/scene-handout-route'
import { originSearchSchema } from '@/shared/components/back-link/backLinkOrigin'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId')({
  validateSearch: originSearchSchema,
  component: HandoutRoute,
})

function HandoutRoute() {
  const { campaignId, scenarioId, sceneId, handoutId } = Route.useParams()
  const { from } = Route.useSearch()

  return <SceneHandoutRoute campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} handoutId={handoutId} from={from} />
}
