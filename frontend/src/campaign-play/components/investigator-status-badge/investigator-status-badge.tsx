import { CircleCheck, CircleDashed, Clock, MessageSquareWarning, type LucideIcon } from 'lucide-react'

import { investigatorStatusLabel, type StatusAudience } from '@/campaign-play/services/investigatorStatusLabels'
import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'
import { Badge, type BadgeProps } from '@/shared/components/ui/badge'

const appearance: Record<InvestigatorStatus, { icon: LucideIcon; variant: BadgeProps['variant'] }> = {
  Draft: { icon: CircleDashed, variant: 'outline' },
  Submitted: { icon: Clock, variant: 'secondary' },
  ChangesRequested: { icon: MessageSquareWarning, variant: 'outline' },
  Approved: { icon: CircleCheck, variant: 'default' },
}

interface InvestigatorStatusBadgeProps {
  status: InvestigatorStatus
  audience: StatusAudience
}

/** An Investigator's status as a text badge; the icon and colour only support the text (WCAG 1.4.1). */
export function InvestigatorStatusBadge({ status, audience }: InvestigatorStatusBadgeProps) {
  const { icon: Icon, variant } = appearance[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" className="size-3.5" />
      {investigatorStatusLabel(status, audience)}
    </Badge>
  )
}
