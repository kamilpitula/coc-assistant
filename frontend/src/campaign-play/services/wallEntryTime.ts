interface WallEntryTimeOptions {
  locale?: string
  timeZone?: string
}

export interface WallEntryTimeText {
  /** What is shown. */
  text: string
  /** The full date and time, only when the shown text leaves the date out. */
  label?: string
}

function formatParts(date: Date, parts: Intl.DateTimeFormatOptions, { locale, timeZone }: WallEntryTimeOptions): string {
  return new Intl.DateTimeFormat(locale, { ...parts, timeZone, hour12: false }).format(date)
}

const TIME = { hour: '2-digit', minute: '2-digit' } as const

/** The visible time of a Wall Entry (specs/campaign-wall/ux.md section 3), in the viewer's locale and time zone. */
export function formatWallEntryTime(createdAt: string, now: Date, options: WallEntryTimeOptions = {}): WallEntryTimeText {
  const created = new Date(createdAt)
  const day = (date: Date) => formatParts(date, { year: 'numeric', month: 'numeric', day: 'numeric' }, options)

  if (day(created) === day(now)) {
    return {
      text: formatParts(created, TIME, options),
      label: `${formatParts(created, { day: 'numeric', month: 'long', year: 'numeric' }, options)}, ${formatParts(created, TIME, options)}`,
    }
  }

  const year = (date: Date) => formatParts(date, { year: 'numeric' }, options)
  const dateParts: Intl.DateTimeFormatOptions = year(created) === year(now) ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }
  return { text: formatParts(created, { ...dateParts, ...TIME }, options) }
}
