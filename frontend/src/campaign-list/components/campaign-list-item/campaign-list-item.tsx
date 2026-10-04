import { Link } from '@tanstack/react-router'
import { Clock } from 'lucide-react'

import { InvestigatorStatusBadge } from '@/campaign-play/components/investigator-status-badge/investigator-status-badge'
import { approvedCopy, detailsCopy, ownInvestigatorCopy, playersCopy } from '@/campaign-list/services/campaignListCopy'
import type { CampaignListItem as CampaignListItemData, PlayerCampaignListItem } from '@/campaign-list/types/CampaignListItem'
import { Badge } from '@/shared/components/ui/badge'

interface CampaignListItemProps {
  item: CampaignListItemData
}

/**
 * One Campaign on the Campaign List (specs/campaign-list/ux.md section 3). The name link is stretched over the whole
 * item, so the item is a single link named by the Campaign name; the badge and counts sit outside its name.
 */
export function CampaignListItem({ item }: CampaignListItemProps) {
  return (
    <li className="relative flex flex-col gap-1 px-4 py-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset hover:bg-muted">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 font-medium break-words">
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId: item.id }}
            className="inline-block min-h-6 after:absolute after:inset-0 focus-visible:outline-none"
          >
            {item.name}
          </Link>
        </h3>
        {item.role === 'Keeper' ? <AwaitingReviewBadge count={item.awaitingReviewCount} /> : <OwnStatusBadge item={item} />}
      </div>
      <p className="text-sm text-muted-foreground">{detailsCopy(item)}</p>
      <p className="text-sm">
        {playersCopy(item)}, {approvedCopy(item.approvedInvestigatorCount)}
      </p>
      {item.role === 'Player' && item.myInvestigator && (
        <p className="text-sm">{ownInvestigatorCopy(item.myInvestigator.name)}</p>
      )}
    </li>
  )
}

function AwaitingReviewBadge({ count }: { count: number }) {
  if (count === 0) {
    return null
  }
  return (
    <Badge variant="secondary">
      <Clock aria-hidden="true" className="size-3.5" />
      {count} awaiting review
    </Badge>
  )
}

function OwnStatusBadge({ item }: { item: PlayerCampaignListItem }) {
  if (!item.myInvestigator) {
    return <Badge variant="outline">No Investigator yet</Badge>
  }
  return <InvestigatorStatusBadge status={item.myInvestigator.status} audience="Player" />
}
