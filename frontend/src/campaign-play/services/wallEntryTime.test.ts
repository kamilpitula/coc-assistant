import { describe, expect, it } from 'vitest'

import { formatWallEntryTime } from './wallEntryTime'

// specs/campaign-wall/ux.md section 3: time only today, the date added otherwise, the year added in another year.
const options = { locale: 'en-GB', timeZone: 'UTC' }
const now = new Date('2026-10-16T20:00:00Z')

describe('formatWallEntryTime', () => {
  it('shows the time alone for an entry from today and spells the full date in the label', () => {
    expect(formatWallEntryTime('2026-10-16T19:02:00+00:00', now, options)).toEqual({
      text: '19:02',
      label: '16 October 2026, 19:02',
    })
  })

  it('adds the date for an entry from another day this year, with no extra label', () => {
    expect(formatWallEntryTime('2026-10-03T19:02:00+00:00', now, options)).toEqual({ text: '3 Oct, 19:02' })
  })

  it('adds the year for an entry from another year', () => {
    expect(formatWallEntryTime('2025-10-03T19:02:00+00:00', now, options)).toEqual({ text: '3 Oct 2025, 19:02' })
  })

  it('decides what today is in the viewer time zone', () => {
    const lateEvening = new Date('2026-10-16T23:30:00Z')

    expect(formatWallEntryTime('2026-10-16T05:00:00Z', lateEvening, { locale: 'en-GB', timeZone: 'Pacific/Auckland' })).toEqual({
      text: '16 Oct, 18:00',
    })
  })
  // CI runs in a US English locale, where the date is month-first; the same instant must still read correctly.
  it('follows the locale order for the date in the label', () => {
    expect(formatWallEntryTime('2026-10-16T19:02:00+00:00', now, { locale: 'en-US', timeZone: 'UTC' })).toEqual({
      text: '19:02',
      label: 'October 16, 2026, 19:02',
    })
  })

  it('shows the first hour of the day as 00, not 24, in any locale', () => {
    const early = new Date('2026-10-16T08:00:00Z')

    expect(formatWallEntryTime('2026-10-16T00:30:00Z', early, { locale: 'en-US', timeZone: 'UTC' }).text).toBe('00:30')
  })
})
