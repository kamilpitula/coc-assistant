import { describe, expect, it } from 'vitest'

import { formatSceneTime } from './sceneTime'

// specs/scenario-preparation/ux.md section 12: Intl.DateTimeFormat, dateStyle medium, timeStyle short.
describe('formatSceneTime', () => {
  it('formats a date and a time in the given locale', () => {
    const iso = '2026-10-12T19:40:00Z'

    const expected = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

    expect(formatSceneTime(iso, 'en-GB')).toBe(expected)
    expect(formatSceneTime(iso, 'en-GB')).toMatch(/Oct/)
  })
})
