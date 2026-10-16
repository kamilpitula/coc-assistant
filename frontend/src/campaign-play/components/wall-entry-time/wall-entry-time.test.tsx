import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WallEntryTime } from './wall-entry-time'

// specs/campaign-wall/ux.md section 3; WL-A11Y-1. The viewer's locale and time zone are fixed so the result does not
// depend on the machine running the test.
const now = new Date('2026-10-16T20:00:00Z')

describe('WallEntryTime', () => {
  it('is a time element carrying the machine-readable instant', () => {
    render(<WallEntryTime createdAt="2026-10-03T19:02:00Z" now={now} locale="en-GB" timeZone="UTC" />)

    const time = document.querySelector('time')
    expect(time).toHaveAttribute('datetime', '2026-10-03T19:02:00Z')
    expect(time).not.toHaveAttribute('aria-label')
  })

  it.each([
    ['en-GB', '16 October 2026, 19:02'],
    ['en-US', 'October 16, 2026, 19:02'],
  ])('spells the full date in its accessible name when the visible text leaves the date out (%s)', (locale, label) => {
    render(<WallEntryTime createdAt="2026-10-16T19:02:00Z" now={now} locale={locale} timeZone="UTC" />)

    const time = screen.getByLabelText(label)
    expect(time).toBe(document.querySelector('time'))
    expect(time).toHaveTextContent('19:02')
  })

  it('decides "today" in the given time zone, not the machine one', () => {
    render(<WallEntryTime createdAt="2026-10-16T05:00:00Z" now={now} locale="en-GB" timeZone="Pacific/Auckland" />)

    expect(document.querySelector('time')).toHaveTextContent('16 Oct, 18:00')
  })
})
