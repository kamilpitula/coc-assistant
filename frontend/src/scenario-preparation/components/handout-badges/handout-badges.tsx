import { Eye, Lock, type LucideIcon } from 'lucide-react'

import {
  HANDOUT_KIND_LABELS,
  HANDOUT_VISIBILITY_LABELS,
  type HandoutKind,
  type HandoutVisibility,
} from '@/scenario-preparation/types/Handout'
import { Badge } from '@/shared/components/ui/badge'

const VISIBILITY_ICONS: Record<HandoutVisibility, LucideIcon> = {
  PlayerFacing: Eye,
  KeeperFacing: Lock,
}

interface HandoutBadgesProps {
  kind: HandoutKind
  visibility: HandoutVisibility
}

/** A Handout's kind and visibility as text badges; the icons only support the text (SP-A11Y-38, WCAG 1.4.1). */
export function HandoutBadges({ kind, visibility }: HandoutBadgesProps) {
  const VisibilityIcon = VISIBILITY_ICONS[visibility]

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">{HANDOUT_KIND_LABELS[kind]}</Badge>
      <Badge variant="outline">
        <VisibilityIcon aria-hidden="true" className="size-3.5" />
        {HANDOUT_VISIBILITY_LABELS[visibility]}
      </Badge>
    </span>
  )
}
