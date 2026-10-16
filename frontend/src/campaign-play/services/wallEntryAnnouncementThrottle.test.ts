import { describe, expect, it } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import {
  initialWallEntryAnnouncementState,
  wallEntryAnnouncementReducer,
  type WallEntryAnnouncementState,
} from './wallEntryAnnouncementThrottle'

// specs/campaign-wall/ux.md section 4.5: the first batch is announced at once, later batches within 5 seconds merge.

function entry(id: string, author = 'Eleanor Hart'): WallEntry {
  return { id, text: id, visibility: 'Public', createdAt: '2026-10-16T19:00:00Z', authorDisplayName: author }
}

function run(...actions: Parameters<typeof wallEntryAnnouncementReducer>[1][]): WallEntryAnnouncementState {
  return actions.reduce(wallEntryAnnouncementReducer, initialWallEntryAnnouncementState)
}

describe('wallEntryAnnouncementReducer', () => {
  it('announces the first batch at once and opens a window', () => {
    const state = run({ type: 'batchReceived', entries: [entry('a')] })

    expect(state.message).toBe('New Wall Entry from Eleanor Hart.')
    expect(state.windowOpen).toBe(true)
  })

  it('holds batches received within the window and announces them merged when the window ends', () => {
    const state = run(
      { type: 'batchReceived', entries: [entry('a')] },
      { type: 'batchReceived', entries: [entry('b')] },
      { type: 'batchReceived', entries: [entry('c')] },
    )
    expect(state.message).toBe('New Wall Entry from Eleanor Hart.')

    const ended = wallEntryAnnouncementReducer(state, { type: 'windowElapsed' })

    expect(ended.message).toBe('2 new Wall Entries from Eleanor Hart.')
    expect(ended.windowOpen).toBe(true)
  })

  it('merges held batches from several authors into a count only', () => {
    const state = run(
      { type: 'batchReceived', entries: [entry('a')] },
      { type: 'batchReceived', entries: [entry('b', 'Ana Ruiz')] },
      { type: 'batchReceived', entries: [entry('c')] },
      { type: 'windowElapsed' },
    )

    expect(state.message).toBe('2 new Wall Entries.')
  })

  it('closes the window when nothing was held, so the next batch is announced at once again', () => {
    const closed = run({ type: 'batchReceived', entries: [entry('a')] }, { type: 'windowElapsed' })
    expect(closed.windowOpen).toBe(false)

    const next = wallEntryAnnouncementReducer(closed, { type: 'batchReceived', entries: [entry('b', 'Ana Ruiz')] })

    expect(next.message).toBe('New Wall Entry from Ana Ruiz.')
    expect(next.windowOpen).toBe(true)
  })

  it('counts every announcement so an identical message is still a new one', () => {
    const first = run({ type: 'batchReceived', entries: [entry('a')] }, { type: 'windowElapsed' })
    const second = wallEntryAnnouncementReducer(first, { type: 'batchReceived', entries: [entry('b')] })

    expect(second.message).toBe(first.message)
    expect(second.sequence).toBe(first.sequence + 1)
  })
})
