import { createFileRoute } from '@tanstack/react-router'

import { HumanNpcPage } from '@/scenario-preparation/components/human-npc-page/human-npc-page'
import { originSearchSchema } from '@/shared/components/back-link/backLinkOrigin'

export const Route = createFileRoute('/campaigns/$campaignId/human-npcs/$humanNpcId')({
  validateSearch: originSearchSchema,
  component: HumanNpcRoute,
})

function HumanNpcRoute() {
  const { campaignId, humanNpcId } = Route.useParams()
  const { from } = Route.useSearch()

  return <HumanNpcPage campaignId={campaignId} humanNpcId={humanNpcId} from={from} />
}
