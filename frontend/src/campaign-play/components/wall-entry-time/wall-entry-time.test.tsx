import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WallEntryTime } from './wall-entry-time'

// specs/campaign-wall/ux.md section 3; WL-A11Y-1.
describe('WallEntryTime', () => {
  it('is a time element carrying the machine-readable instant', () => {
    render(<WallEntryTime createdAt="2026-10-03T19:02:00Z" now={new Date('2026-10-16T20:00:00Z')} />)

    const time = document.querySelector('time')
    expect(time).toHaveAttribute('datetime', '2026-10-03T19:02:00Z')
    expect(time).not.toHaveAttribute('aria-label')
  })

  it('spells the full date in its accessible name when the visible text leaves the date out', () => {
    render(<WallEntryTime createdAt="2026-10-16T19:02:00Z" now={new Date('2026-10-16T20:00:00Z')} />)

    expect(screen.getByLabelText(/October 2026/)).toBe(document.querySelector('time'))
  })
})
