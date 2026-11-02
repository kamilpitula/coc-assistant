import { createFileRoute } from '@tanstack/react-router'

import { CluesPage } from '@/scene-play/components/clues-page/clues-page'

export const Route = createFileRoute('/campaigns/$campaignId/investigator/clues')({
  component: MyCluesRoute,
})

function MyCluesRoute() {
  const { campaignId } = Route.useParams()

  return <CluesPage campaignId={campaignId} />
}
