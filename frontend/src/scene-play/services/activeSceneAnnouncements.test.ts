import { describe, expect, it } from 'vitest'

import type { ActiveScene } from '@/scene-play/types/ActiveScene'

import { announcementFor } from './activeSceneAnnouncements'

// specs/scene-play/ux.md section 4.4: what a Player hears when the Active Scene changes after the first load.
const absent: ActiveScene = { kind: 'absent-player', title: 'The Corbitt House' }
const present: ActiveScene = {
  kind: 'present-player',
  title: 'The Corbitt House',
  location: 'Arkham',
  investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }],
}
const otherPresent: ActiveScene = { ...present, investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }, { name: 'Lucy Ward', isYours: false }] }
const other: ActiveScene = { kind: 'absent-player', title: 'Meeting Knott' }

describe('announcementFor', () => {
  it('announces a Scene that starts', () => {
    expect(announcementFor(null, present)).toBe('The Corbitt House started.')
    expect(announcementFor(null, absent)).toBe('The Corbitt House started.')
  })

  it('announces a Scene that finishes, by the title it had', () => {
    expect(announcementFor(present, null)).toBe('The Corbitt House finished.')
  })

  it('announces a different Scene as started', () => {
    expect(announcementFor(absent, other)).toBe('Meeting Knott started.')
  })

  it("announces the Player's Investigator being added and removed", () => {
    expect(announcementFor(absent, present)).toBe("You're now taking part in The Corbitt House.")
    expect(announcementFor(present, absent)).toBe("You're no longer taking part in The Corbitt House.")
  })

  it('says nothing for other changes to the present list, or for no change', () => {
    expect(announcementFor(present, otherPresent)).toBeNull()
    expect(announcementFor(present, present)).toBeNull()
    expect(announcementFor(null, null)).toBeNull()
  })

  it('says nothing for the Keeper, who is the only actor', () => {
    const keeper: ActiveScene = { kind: 'keeper', sceneId: 's', scenarioId: 'p', scenarioTitle: 'T', title: 'X', location: '', startedAt: null, investigatorsPresent: [], reveals: [] }

    expect(announcementFor(null, keeper)).toBeNull()
    expect(announcementFor(keeper, null)).toBeNull()
  })
})
