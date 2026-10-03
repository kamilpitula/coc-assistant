import { Circle, CircleDashed, type LucideIcon } from 'lucide-react'

import type { DisplayedPresence } from '@/campaign-play/types/CampaignMember'
import { cn } from '@/shared/components/utils'

interface IndicatorStyle {
  Icon: LucideIcon
  text: string
  iconClassName: string
  textClassName: string
}

// specs/campaign-play/ux.md section 3: the text always shows; the icon only supports it.
const STYLES: Record<DisplayedPresence, IndicatorStyle> = {
  Connected: { Icon: Circle, text: 'Connected', iconClassName: 'fill-current text-success', textClassName: 'text-foreground' },
  NotConnected: { Icon: Circle, text: 'Not connected', iconClassName: 'text-muted-foreground', textClassName: 'text-muted-foreground' },
  Unknown: { Icon: CircleDashed, text: 'Unknown', iconClassName: 'text-muted-foreground', textClassName: 'text-muted-foreground' },
}

/** A Campaign Member's Presence as an icon and text (ux.md section 3). State changes swap both in place. */
export function PresenceIndicator({ presence }: { presence: DisplayedPresence }) {
  const { Icon, text, iconClassName, textClassName } = STYLES[presence]

  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', textClassName)}>
      <Icon aria-hidden="true" className={cn('size-3 shrink-0', iconClassName)} />
      {text}
    </span>
  )
}
