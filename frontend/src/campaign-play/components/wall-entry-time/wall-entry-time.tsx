import { formatWallEntryTime } from '@/campaign-play/services/wallEntryTime'

interface WallEntryTimeProps {
  createdAt: string
  /** The current time; only tests and stories set it. */
  now?: Date
  /** The viewer's locale and time zone; only tests and stories set them, the browser's are used otherwise. */
  locale?: string
  timeZone?: string
}

/** A Wall Entry's time as a `time` element (specs/campaign-wall/ux.md section 3). */
export function WallEntryTime({ createdAt, now = new Date(), locale, timeZone }: WallEntryTimeProps) {
  const { text, label } = formatWallEntryTime(createdAt, now, { locale, timeZone })

  return (
    <time dateTime={createdAt} aria-label={label} className="text-sm text-muted-foreground">
      {text}
    </time>
  )
}
