import { createFileRoute } from '@tanstack/react-router'

import { CluesPage } from '@/scene-play/components/clues-page/clues-page'
import { originSearchSchema } from '@/shared/components/back-link/backLinkOrigin'

export const Route = createFileRoute('/campaigns/$campaignId/investigator/clues')({
  validateSearch: originSearchSchema,
  component: MyCluesRoute,
})

function MyCluesRoute() {
  const { campaignId } = Route.useParams()
  const { from } = Route.useSearch()

  return <CluesPage campaignId={campaignId} from={from} />
}
