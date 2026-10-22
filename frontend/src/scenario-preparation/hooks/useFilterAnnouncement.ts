import { useEffect, useRef, useState } from 'react'

const ANNOUNCEMENT_DELAY_MS = 500

/**
 * "{n} shown." after the search or filter changes, debounced; empty on first load (SP-A11Y-23, SP-A11Y-32). Render it in a
 * polite live region.
 */
export function useFilterAnnouncement(count: number, filterKey: string): string {
  const [announcement, setAnnouncement] = useState('')
  const previousKey = useRef(filterKey)

  useEffect(() => {
    if (previousKey.current === filterKey) {
      return
    }
    previousKey.current = filterKey
    const timer = setTimeout(() => setAnnouncement(`${count} shown.`), ANNOUNCEMENT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [count, filterKey])

  return announcement
}
