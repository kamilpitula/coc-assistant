import { useState } from 'react'

import { describeInvestigatorChanges } from '@/campaign-play/services/investigatorAnnouncements'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

interface Tracking {
  baseline: CampaignMember[] | undefined
  announcement: string
}

/**
 * The text for the roster's polite live region (specs/campaign-overview/ux.md section 5.2). It is derived while
 * rendering from the roster before and after a refetch, like the Presence announcements. The roster at the first fetch
 * since opening is the baseline, so cached data and the first load are never announced.
 */
export function useInvestigatorAnnouncement(members: CampaignMember[] | undefined, isFetchedAfterMount: boolean): string {
  const [tracking, setTracking] = useState<Tracking>({ baseline: undefined, announcement: '' })

  if (isFetchedAfterMount && members !== undefined && tracking.baseline !== members) {
    setTracking({ baseline: members, announcement: describeInvestigatorChanges(tracking.baseline, members).join(' ') })
  }

  return tracking.announcement
}
