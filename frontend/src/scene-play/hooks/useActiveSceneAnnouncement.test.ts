import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ActiveScene } from '@/scene-play/types/ActiveScene'

import { useActiveSceneAnnouncement } from './useActiveSceneAnnouncement'

// specs/scene-play/ux.md section 4.4 and SPL-A11Y-5: nothing is announced on the first load.
const absent: ActiveScene = { kind: 'absent-player', title: 'The Corbitt House' }
const present: ActiveScene = { kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [] }

describe('useActiveSceneAnnouncement', () => {
  it('announces nothing for the first fetched value, whatever it is', () => {
    const { result } = renderHook(() => useActiveSceneAnnouncement(present, true))

    expect(result.current).toEqual({ message: '', sequence: 0 })
  })

  it('announces nothing until the data was fetched since the page opened', () => {
    const { result, rerender } = renderHook(({ scene, fetched }) => useActiveSceneAnnouncement(scene, fetched), {
      initialProps: { scene: null as ActiveScene | null | undefined, fetched: false },
    })

    rerender({ scene: absent, fetched: false })

    expect(result.current.message).toBe('')
  })

  it('announces a Scene that starts after the baseline, and one that finishes', () => {
    const { result, rerender } = renderHook(({ scene }) => useActiveSceneAnnouncement(scene, true), {
      initialProps: { scene: null as ActiveScene | null },
    })

    rerender({ scene: absent })
    expect(result.current).toEqual({ message: 'The Corbitt House started.', sequence: 1 })

    rerender({ scene: null })
    expect(result.current).toEqual({ message: 'The Corbitt House finished.', sequence: 2 })
  })

  it("announces the Player's Investigator being added, and nothing for a refetch that finds no change", () => {
    const { result, rerender } = renderHook(({ scene }) => useActiveSceneAnnouncement(scene, true), {
      initialProps: { scene: absent as ActiveScene | null },
    })

    rerender({ scene: present })
    expect(result.current.message).toBe("You're now taking part in The Corbitt House.")

    rerender({ scene: { ...present } })
    expect(result.current.sequence).toBe(1)
  })
})
