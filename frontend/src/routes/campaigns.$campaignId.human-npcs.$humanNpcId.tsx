import { createFileRoute } from '@tanstack/react-router'

import { HumanNpcPage } from '@/scenario-preparation/components/human-npc-page/human-npc-page'

export const Route = createFileRoute('/campaigns/$campaignId/human-npcs/$humanNpcId')({
  component: HumanNpcRoute,
})

function HumanNpcRoute() {
  const { campaignId, humanNpcId } = Route.useParams()

  return <HumanNpcPage campaignId={campaignId} humanNpcId={humanNpcId} />
}
