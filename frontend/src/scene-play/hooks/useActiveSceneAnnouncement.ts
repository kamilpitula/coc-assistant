import { useEffect, useRef, useState } from 'react'

import { announcementFor } from '@/scene-play/services/activeSceneAnnouncements'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'

/** The text for a polite live region; the sequence changes with every announcement, even for identical text. */
export interface ActiveSceneAnnouncement {
  message: string
  sequence: number
}

/**
 * Announces what changed in the Active Scene after the first fetch since the page opened (specs/scene-play/ux.md section 4.4).
 * The first fetched value is the baseline, so cached data, the first load, and a refetch that finds no change announce nothing.
 * `scene` is undefined until a value is known and null when no Scene is Active.
 */
export function useActiveSceneAnnouncement(scene: ActiveScene | null | undefined, isFetchedAfterMount: boolean): ActiveSceneAnnouncement {
  const [announcement, setAnnouncement] = useState<ActiveSceneAnnouncement>({ message: '', sequence: 0 })
  const previous = useRef<ActiveScene | null | undefined>(undefined)

  useEffect(() => {
    if (!isFetchedAfterMount || scene === undefined) {
      return
    }

    const message = previous.current === undefined ? null : announcementFor(previous.current, scene)
    previous.current = scene
    if (message) {
      setAnnouncement((current) => ({ message, sequence: current.sequence + 1 }))
    }
  }, [scene, isFetchedAfterMount])

  return announcement
}
