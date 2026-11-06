import { createFileRoute } from '@tanstack/react-router'

import { ItemPage } from '@/scenario-preparation/components/item-page/item-page'
import { originSearchSchema } from '@/shared/components/back-link/backLinkOrigin'

export const Route = createFileRoute('/campaigns/$campaignId/items/$itemId/')({
  validateSearch: originSearchSchema,
  component: ItemRoute,
})

function ItemRoute() {
  const { campaignId, itemId } = Route.useParams()
  const { from } = Route.useSearch()

  return <ItemPage campaignId={campaignId} itemId={itemId} from={from} />
}
