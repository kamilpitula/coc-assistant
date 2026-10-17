import { CircleCheck, CircleDashed, Play, type LucideIcon } from 'lucide-react'

import type { SceneStatus } from '@/scenario-preparation/types/Scene'
import { Badge, type BadgeProps } from '@/shared/components/ui/badge'

const appearance: Record<SceneStatus, { icon: LucideIcon; variant: BadgeProps['variant'] }> = {
  Prepared: { icon: CircleDashed, variant: 'outline' },
  Active: { icon: Play, variant: 'default' },
  Finished: { icon: CircleCheck, variant: 'secondary' },
}

interface SceneStatusBadgeProps {
  status: SceneStatus
}

/** A Scene's status as a text badge; the icon and colour only support the text (SP-A11Y-11, WCAG 1.4.1). */
export function SceneStatusBadge({ status }: SceneStatusBadgeProps) {
  const { icon: Icon, variant } = appearance[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
    </Badge>
  )
}
