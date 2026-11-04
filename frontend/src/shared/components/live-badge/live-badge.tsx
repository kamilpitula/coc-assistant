import { Badge } from '@/shared/components/ui/badge'

/** The "Live" marker on the Active Scene tab while a Scene is Active (specs/navigation/ux.md section 2). */
export function LiveBadge() {
  return (
    <Badge>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      Live
    </Badge>
  )
}
